use image::{codecs::png::PngEncoder, ColorType, ImageEncoder};
use plotters::{chart::ChartBuilder, prelude::{BitMapBackend, IntoDrawingArea, Rectangle}, style::{Color, RGBColor, WHITE, BLACK}};
use plotters::style::IntoFont;
use revm::primitives::{alloy_primitives::Keccak256, U256};
use alloy_sol_types::{sol, SolValue};
use revm::primitives::PrecompileError;
use plotters::style::text_anchor::{HPos, VPos};

sol! {
    struct Record {
        string label;
        address record_address;
        uint256 value;
    }
}

pub fn decode_records(input: &[u8]) -> Result<Vec<Record>, PrecompileError> {
    // Alloy knows how to decode a `Vec<T>` whenever `T: AbiDecode`.
    Vec::<Record>::abi_decode(input, true)
        // map Alloy's decode errors into our PrecompileError
        .map_err(|e| PrecompileError::Other(format!("ABI decode error: {}", e)))    
}

/// Canvas size.
const IMG_WIDTH: u32 = 600;
const IMG_HEIGHT: u32 = 400;
const MARGIN: u32 = 40;

/// Derive a color from a 20-byte address.
pub fn address2color(addr: &[u8;20]) -> RGBColor {
    let mut h = Keccak256::new();
    h.update(addr);
    let d = h.finalize();
    RGBColor(d[0], d[1], d[2])
}

/// Render a bar-chart with axes and category labels into a PNG.
pub fn render_chart(
    records: Vec<Record>,
) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    // Store full-precision loot values
    let values: Vec<U256> = records.iter().map(|r| r.value).collect();
    // For charting, convert to ETH and then to u64 (clamp to u64::MAX if overflow)
    let values_u64: Vec<u64> = values.iter()
        .map(|v| (*v / U256::from(1e18 as u64)).try_into().unwrap_or(u64::MAX))
        .collect();
    let colors: Vec<RGBColor> = records.iter().map(|r| address2color(&r.record_address.0)).collect();
    let labels: Vec<String> = records.iter().map(|r| r.label.clone()).collect();

    // 1) Allocate raw RGB buffer
    let mut raw = vec![0u8; (IMG_WIDTH * IMG_HEIGHT * 3) as usize];

    {
        // 2) Draw with Plotters
        let backend = BitMapBackend::with_buffer(&mut raw, (IMG_WIDTH, IMG_HEIGHT));
        let root = backend.into_drawing_area();
        root.fill(&WHITE)?;

        // Determine max for Y
        let maxv = values_u64.iter().max().copied().unwrap_or(0);
        let y_max = if maxv < 10 { 20 } else { maxv + (maxv / 8) + 16 }; // add ~12.5% headroom

        // Compute bar width and offset for centering labels
        let available_width = IMG_WIDTH - 2 * MARGIN;
        let bar_w = available_width / values_u64.len() as u32;
        // Labels have fixed format "0x1234...abcd", length 13 chars
        const CHAR_W: u32 = 2;
        let label_px = 13 * CHAR_W;
        let x_offset = (bar_w / 2) as i32 - (label_px / 2) as i32;

        // Build chart
        let mut chart = ChartBuilder::on(&root)
            .margin(MARGIN)
            .x_label_area_size(40)
            .y_label_area_size(60)
            .build_cartesian_2d(0.0f64..values_u64.len() as f64, 0.0f64..y_max as f64)?;

        // Draw mesh with custom label formatter and offset
        chart.configure_mesh()
            .axis_desc_style(("sans-serif", 20))
            .label_style(("sans-serif", 16))
            .x_labels(0) // suppress default x labels
            .x_label_formatter(&|_| String::new())
            .x_label_offset(x_offset)
            .disable_mesh()
            .draw()?;

        // Draw custom x labels centered under each bar
        let font = ("sans-serif", 16).into_font().color(&BLACK);
        for (i, label) in labels.iter().enumerate() {
            chart.draw_series(std::iter::once(
                plotters::element::Text::new(
                    label.clone(),
                    (i as f64 + 0.5, -50.0),
                    font.clone().pos(plotters::style::text_anchor::Pos::new(HPos::Center, VPos::Top)),
                )
            ))?;
        }

        // Draw bars and print value above each bar
        chart.draw_series(
            values_u64.iter().enumerate().map(|(i, &v)| {
                let rect = Rectangle::new(
                    [(i as f64, 0.0), (i as f64 + 1.0, v as f64)],
                    colors[i].filled(),
                );
                rect
            }),
        )?;
        // Draw value above each bar
        for (i, &v) in values_u64.iter().enumerate() {
            let x = i as f64 + 0.35; // a bit to the left
            let y = v as f64 + (y_max as f64 / 40.0).max(10.0) + 5.0; // a bit higher
            chart.draw_series(std::iter::once(
                plotters::element::Text::new(
                    format!("{}", v),
                    (x, y),
                    ("sans-serif", 16).into_font().color(&BLACK),
                )
            ))?;
        }
    }

    // 3) PNG-encode
    let mut png = Vec::new();
    {
        let encoder = PngEncoder::new(&mut png);
        encoder.write_image(&raw, IMG_WIDTH, IMG_HEIGHT, ColorType::Rgb8.into())?;
    }
    Ok(png)
}