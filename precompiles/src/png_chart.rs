use revm::{
    precompile::{u64_to_address, PrecompileWithAddress},
    primitives::{Bytes, Precompile, PrecompileError, PrecompileOutput, PrecompileResult},
};
use crate::png_chart_utils::{render_chart, decode_records};

/// Precompile address.
pub const ADDRESS: u64 = 0xC0;

/// Gas parameters.
const GAS_BASE_FEE: u64 = 25_000;
const GAS_PER_DATA_POINT: u64 = 1_000;

/// Register at 0xC0.
pub const PRECOMPILE: PrecompileWithAddress =
    PrecompileWithAddress(u64_to_address(ADDRESS), Precompile::Standard(png_chart));

/// Precompile entrypoint.
pub fn png_chart(input: &Bytes, gas_limit: u64) -> PrecompileResult {
    // Gas & length checks
    if gas_limit < GAS_BASE_FEE + GAS_PER_DATA_POINT {
        return Err(PrecompileError::OutOfGas.into());
    }
    if input.is_empty() {
        return Err(PrecompileError::Other("empty input".into()).into());
    }
    
    let records = decode_records(input.as_ref()).map_err(|e| PrecompileError::Other(format!("input decoding failed: {}", e)))?;
    let gas_used = GAS_BASE_FEE + GAS_PER_DATA_POINT * (records.len() as u64);
    
    // Render
    let png = render_chart(records)
        .map_err(|e| PrecompileError::Other(format!("Plot error: {}", e)))?;

    Ok(PrecompileOutput::new(gas_used, Bytes::from(png)))
}

#[cfg(test)]
mod tests {
    use super::*;
    use revm::primitives::{Bytes, Address, U256};
    use crate::png_chart_utils::Record;
    use alloy_sol_types::SolValue;
    use std::fs;

    #[test]
    fn test_png_chart() {
        let n: u8 = 5;
        let mut recs = Vec::new();
        for i in 1u8..=n {
            let name = format!("Pirate {}", i);
            let pirate = Address::from([i; 20]);
            let loot = U256::from(i) * U256::from(50_000000000000000000u128);
            recs.push(Record { label: name, record_address: pirate, value: loot });
        }
        let input = Bytes::from(recs.abi_encode());

        let out = png_chart(&input, 1_000_000).expect("err");
        assert_eq!(out.gas_used, GAS_BASE_FEE + GAS_PER_DATA_POINT * n as u64);

        let png = out.bytes.as_ref();
        let sig = [0x89u8, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A];
        assert!(png.starts_with(&sig), "PNG hdr missing");

        fs::create_dir_all("test_outputs").unwrap();
        fs::write("test_outputs/chart.png", png).unwrap();
    }
}