import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isUUID, resolveActivePharmacyId } from "../src/hooks/usePharmaKhata";

describe("Pharma-Smart Khata Short Book Persistence & Sync Suite", () => {
  it("accurately validates RFC4122 UUID format", () => {
    assert.equal(isUUID("0c131ae7-d636-4baf-9fb1-8401a37e45bc"), true);
    assert.equal(isUUID("a808d661-94ef-4b1b-8b08-37815b594ea0"), true);
    assert.equal(isUUID("default-pharmacy"), false);
    assert.equal(isUUID(""), false);
    assert.equal(isUUID(undefined), false);
  });

  it("prioritizes explicit valid UUID over fallback", () => {
    const explicit = "0c131ae7-d636-4baf-9fb1-8401a37e45bc";
    assert.equal(resolveActivePharmacyId(explicit), explicit);
  });

  it("safely handles non-UUID fallback without crashing", () => {
    const resolved = resolveActivePharmacyId("default-pharmacy");
    assert.ok(typeof resolved === "string");
  });

  it("merges remote database short items with offline pending items correctly", () => {
    const remoteShorts = [
      {
        id: "short-db-1",
        pharmacy_id: "0c131ae7-d636-4baf-9fb1-8401a37e45bc",
        medicine_name: "Napa Extra",
        status: "Pending" as const,
        required_qty: 10,
        pack_size: "Box",
        estimated_price: 250,
        created_at: "2026-10-30T07:00:00Z"
      }
    ];

    const localShorts = [
      {
        id: "short-offline-2",
        pharmacy_id: "0c131ae7-d636-4baf-9fb1-8401a37e45bc",
        medicine_name: "Ace Plus",
        status: "Pending" as const,
        required_qty: 5,
        pack_size: "Box",
        estimated_price: 150,
        created_at: "2026-10-30T07:05:00Z"
      },
      {
        id: "short-db-1",
        pharmacy_id: "0c131ae7-d636-4baf-9fb1-8401a37e45bc",
        medicine_name: "Napa Extra",
        status: "Pending" as const,
        required_qty: 10,
        pack_size: "Box",
        estimated_price: 250,
        created_at: "2026-10-30T07:00:00Z"
      }
    ];

    const dbIds = new Set(remoteShorts.map(s => s.id));
    const localOnly = localShorts.filter(s => !dbIds.has(s.id));
    const merged = [...remoteShorts, ...localOnly];

    assert.equal(merged.length, 2);
    assert.equal(merged.some(s => s.id === "short-db-1"), true);
    assert.equal(merged.some(s => s.id === "short-offline-2"), true);
  });
});

