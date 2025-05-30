use revm::{
    precompile::{PrecompileWithAddress, u64_to_address},
    primitives::{Bytes, Precompile, PrecompileError, PrecompileOutput, PrecompileResult, U256},
};

/// Precompile address.
pub const ADDRESS: u64 = 0xF0;

/// Gas constants
const GAS_BASE_FEE: u64 = 750;
const GAS_STEP_FEE: u64 = 50;

/// Precompile definition.
pub const PRECOMPILE: PrecompileWithAddress =
    PrecompileWithAddress(u64_to_address(ADDRESS), Precompile::Standard(fibonacci));

/// Fast-doubling helper: returns (F(n), F(n+1))
fn fib_pair(n: U256) -> (U256, U256) {
    if n.is_zero() {
        // F(0) = 0, F(1) = 1
        return (U256::ZERO, U256::ONE);
    }
    // recurse on n // 2
    let (a, b) = fib_pair(n >> 1);
    // c = F(2k)   = F(k) * [2·F(k+1) − F(k)]
    let two_b = b << 1;
    let c = a * (two_b - a);
    // d = F(2k+1) = F(k)^2 + F(k+1)^2
    let d = a * a + b * b;
    if (n & U256::ONE).is_zero() {
        (c, d)
    } else {
        // odd case: F(2k+1), F(2k+2)
        (d, c + d)
    }
}

pub fn fibonacci(input: &Bytes, gas_limit: u64) -> PrecompileResult {
    if gas_limit < GAS_BASE_FEE {
        return Err(PrecompileError::OutOfGas.into());
    }

    if input.is_empty() {
        return Err(
            PrecompileError::Other("precompile input must not be empty".to_string()).into(),
        );
    }

    let data = input.as_ref();
    if data.len() > 32 {
        return Err(PrecompileError::Other("input too large to fit in U256".to_string()).into());
    }

    let mut buf = [0u8; 32];
    buf[32 - data.len()..].copy_from_slice(data);
    let n = U256::from_be_bytes(buf);

    let steps = 256 - n.leading_zeros();
    let work = GAS_STEP_FEE
        .checked_mul(steps as u64)
        .ok_or(PrecompileError::OutOfGas)?;
    let gas_used = GAS_BASE_FEE.checked_add(work).ok_or(PrecompileError::OutOfGas)?;

    if gas_used > gas_limit {
        return Err(PrecompileError::OutOfGas.into());
    }

    let (f_n, _) = fib_pair(n);

    let out: [u8; 32] = f_n.to_be_bytes();

    let first_non_zero = out.iter().position(|&b| b != 0).unwrap_or(out.len() - 1);
    let out_bytes = Bytes::copy_from_slice(&out[first_non_zero..]);

    Ok(PrecompileOutput::new(gas_used, out_bytes))
}

#[cfg(test)]
mod tests {
    use std::time::Instant;

    use super::*;
    use revm::primitives::{Bytes, U256};

    /// Helper to invoke your precompile and parse the returned `Bytes` into a `U256`.
    fn run_fib(n: u64) -> (U256, u64) {
        // 1) Serialize n as minimal big-endian bytes
        let mut data = n.to_be_bytes().to_vec();
        while data.len() > 1 && data[0] == 0 {
            data.remove(0);
        }
        let input = Bytes::from(data.clone());

        // 2) Recompute the exact gas_limit your precompile will charge:
        //    GAS_BASE_FEE + GAS_STEP_FEE * steps, where steps = 256 - n.leading_zeros()
        let n_u256 = U256::from(n);
        let steps = 256 - n_u256.leading_zeros();
        let work = GAS_STEP_FEE * steps as u64;
        let gas_limit = GAS_BASE_FEE + work;

        // 3) Call the precompile with exactly that gas limit
        let output = fibonacci(&input, gas_limit).expect("should succeed with sufficient gas");

        // 4) Read back the returned bytes
        let ret = output.bytes;
        let slice = ret.as_ref();
        let mut buf = [0u8; 32];
        buf[32 - slice.len()..].copy_from_slice(slice);

        (U256::from_be_bytes(buf), output.gas_used)
    }

    #[test]
    fn test_fib_values() {
        // (n, F(n))
        let cases = [
            (0, U256::from(0)),
            (1, U256::from(1)),
            (2, U256::from(1)),
            (3, U256::from(2)),
            (4, U256::from(3)),
            (5, U256::from(5)),
            (10, U256::from(55)),
            (15, U256::from(610)),
            (20, U256::from(6_765)),
            (30, U256::from(832_040)),
            (50, U256::from(12_586_269_025u64)),
        ];
        for (n, expected) in cases {
            let (result, _) = run_fib(n);
            assert_eq!(result, expected, "F({}) != {}", n, expected);
        }
    }

    #[test]
    fn test_fib_370() {
        let n = 370;
        let expected = U256::from_str_radix("94611056096305838013295371573764256526437182762229865607320618320601813254535", 10).unwrap();

        let run_time = Instant::now();
        let (result, gas) = run_fib(n);

        println!("[fib][{}] Took: {:.3} ms", n, run_time.elapsed().as_secs_f64() * 1000.0);
        println!("[fib][{}] Gas used: {}", n, gas);

        assert_eq!(result, expected, "F({}) != {}", n, expected);
    }

    #[test]
    fn test_insufficient_gas() {
        let input = Bytes::from(vec![1]); // F(1)=1
        let err = fibonacci(&input, GAS_BASE_FEE);
        assert!(err.is_err(), "expected OutOfGas");
        let e = err.unwrap_err();
        assert!(e.to_string().contains("out of gas"), "wrong error: {}", e);
    }

    #[test]
    fn test_empty_input() {
        let input = Bytes::new();
        let err = fibonacci(&input, GAS_BASE_FEE);
        assert!(err.is_err(), "expected empty-input error");
        let e = err.unwrap_err();
        assert!(
            e.to_string().contains("must not be empty"),
            "wrong error: {}",
            e
        );
    }
}
