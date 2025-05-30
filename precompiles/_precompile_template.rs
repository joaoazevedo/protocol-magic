use revm::{
    precompile::{u64_to_address,PrecompileWithAddress},
    primitives::{Bytes, Precompile,PrecompileError, PrecompileOutput, PrecompileResult},
};

/// Precompile address.
pub const ADDRESS: u64 = 0x00;

/// Precompile base gas fee.
const GAS_BASE_FEE: u64 = 0;

/// Precompile definition.
pub const PRECOMPILE: PrecompileWithAddress =
    PrecompileWithAddress(u64_to_address(ADDRESS), Precompile::Standard(template));

pub fn template(input: &Bytes, gas_limit: u64) -> PrecompileResult {
    // Check if the gas limit is sufficient to cover the base gas fee.
    if gas_limit < GAS_BASE_FEE {
        return Err(PrecompileError::OutOfGas.into());
    }

    if input.is_empty() {
        return Err(PrecompileError::Other(
            "precompile input must not be empty".to_string(),
        ).into());
    }

    Ok(PrecompileOutput::new(GAS_BASE_FEE, Bytes::new()))
}
