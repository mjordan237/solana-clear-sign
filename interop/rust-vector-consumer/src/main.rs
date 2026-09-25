use serde::Deserialize;
use serde_json::Value;

#[derive(Deserialize)]
struct ValidVector {
    name: String,
    idl: Value,
    data: String,
    accounts: Vec<String>,
    expected: String,
}

#[derive(Deserialize)]
struct Expected {
    mode: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AdversarialVector {
    name: String,
    instruction_name: String,
    idl: Value,
    data: String,
    accounts: Vec<String>,
    expected: Expected,
}

fn main() {
    let valid: Vec<ValidVector> = serde_json::from_str(include_str!("../../../test/vectors/valid.json"))
        .expect("valid vectors must be standalone JSON");
    let adversarial: Vec<AdversarialVector> = serde_json::from_str(include_str!("../../../test/vectors/adversarial.materialized.json"))
        .expect("adversarial vectors must be standalone JSON");

    for vector in &valid {
        let bytes = hex::decode(&vector.data).expect("instruction data must be hexadecimal");
        assert!(!vector.name.is_empty());
        assert!(vector.idl.is_object());
        assert!(!vector.expected.is_empty());
        let _ = (&bytes, &vector.accounts);
    }

    for vector in &adversarial {
        let bytes = hex::decode(&vector.data).expect("instruction data must be hexadecimal");
        assert!(!vector.name.is_empty());
        assert!(!vector.instruction_name.is_empty());
        assert!(vector.idl.is_object());
        assert!(matches!(vector.expected.mode.as_str(), "invalid" | "raw_dump"));
        let _ = (&bytes, &vector.accounts);
    }

    println!(
        "parsed {} valid and {} standalone adversarial vectors in Rust",
        valid.len(),
        adversarial.len()
    );
}
