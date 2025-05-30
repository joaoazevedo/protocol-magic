use revm::precompile::PrecompileWithAddress;

mod png_chart_utils;
mod png_chart;
mod fibonacci;

/// Returns the Protocol Magic precompiles with their addresses.
pub fn precompiles() -> impl Iterator<Item = PrecompileWithAddress> {
    [
        fibonacci::PRECOMPILE,
        png_chart::PRECOMPILE,
    ].into_iter()
}
