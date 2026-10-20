# MediChain Android App – Technical Specification & AI Studio Master Prompt

This document provides the complete, production-ready specification and AI Studio prompt to generate the **MediChain Native Android Application** (Kotlin + Jetpack Compose).

---

## 1. Master Prompt for Google AI Studio (Android App Generator)

```markdown
You are a senior Android software engineer specializing in modern Kotlin, Jetpack Compose, Material 3, and Clean Architecture.

Build a complete, production-ready native Android application named "MediChain" (মেডিচেইন) — a premium B2B Pharmaceutical Procurement & Warehouse Management System for retail pharmacies in Bangladesh.

### APPLICATION SPECIFICATIONS

1. Platform & Language:
   - Target SDK: 35 (Android 15), Min SDK: 26 (Android 8.0)
   - Language: Kotlin 2.0+
   - UI: 100% Jetpack Compose with Material 3
   - Architecture: MVVM + Clean Architecture (Domain, Data, UI layers)
   - Dependency Injection: Hilt or Koin
   - Asynchronous: Coroutines, Kotlin Flow (StateFlow, SharedFlow)

2. Market, Currency & Regional Rules:
   - Country: Bangladesh (BDT, ৳ symbol)
   - Timezone: Asia/Dhaka (UTC+6)
   - Delivery Schedule: Monday, Wednesday, Saturday with strict 12:00 PM BST cutoff.
     * Orders placed before 12:00 PM BST on a delivery day deliver that same day.
     * Orders placed after 12:00 PM BST move to the next scheduled delivery day.
     * Orders for the same pharmacy on the same delivery date consolidate into ONE invoice with a single ৳40 delivery charge.
   - Payment: 100% Cash on Delivery (COD) with 15-day institutional credit terms.

3. Visual Design System:
   - Primary Color: Emerald Green (#059669 / #10B981)
   - Accent: Teal (#0D9488) & Cyan (#06B6D4)
   - Surfaces: Clean slate-toned cards with edge-to-edge Material 3 styling
   - Category Badges:
     * Tablet: Slate Neutral
     * Capsule: Purple (#9333EA)
     * Syrup / Suspension: Amber (#D97706)
     * Injection: Rose / Red (#E11D48)
     * Ophthalmic (Eye Drops / Care): Cyan (#0891B2) with Eye icon
     * Ear Drops: Blue (#2563EB)
     * Cream / Ointment / Gel: Teal (#0D9488)

4. Key Modules & Screens to Implement:
   A. Pharmacy Authentication & Onboarding:
      - Phone / PIN login and registration wizard.
      - DGDA Drug License & Trade License verification input with document photo upload.
   B. Wholesale Medicine Catalog:
      - Live search across Brand, Generic, and Manufacturer (Square, Incepta, Beximco, Renata, etc.).
      - Category filter chips (Tablet, Capsule, Syrup, Ophthalmic, Injection, etc.).
      - Product Cards showing Trade Rate, MRP, Profit Margin %, Bulk Tier discounts, and authentic stock levels (no hardcoded zero-stock overrides).
   C. Smart Cart & Checkout:
      - Delivery cycle calculation with live countdown chip to 12:00 PM BST cutoff.
      - ৳40 flat delivery fee with automatic consolidation.
      - COD order confirmation.
   D. Orders & Invoicing:
      - Pipeline tracker: Pending -> Confirmed -> Packed -> In Transit -> Delivered.
      - Detailed consolidated invoice modal with printable / shareable layout.
   E. Warehouse Depot (WMS):
      - CameraX + Google ML Kit Barcode Scanner for EAN-13 barcodes.
      - Warehouse Rack Section locator (Sections A through F, with F dedicated to Ophthalmic).
      - Batch picking checklist.
   F. WhatsApp Support:
      - One-click launch to WhatsApp via wa.me intent for direct customer support.

5. Technical Quality:
   - Provide complete, compilable Kotlin code with data classes, ViewModels, Compose screens, and sample data.
   - Zero placeholder stubs. Handle loading, error, and empty states cleanly.
```

---

## 2. Core Kotlin Domain Models

```kotlin
package com.medichain.app.domain.model

import java.time.Instant
import java.time.LocalDate

data class Product(
    val id: String,
    val name: String,
    val genericName: String,
    val company: String,
    val category: String,
    val strength: String,
    val packSize: String,
    val mrp: Double,
    val sellingPrice: Double,
    val discountPercentage: Double,
    val availableStock: Int,
    val imageUrl: String? = null,
    val barcode: String? = null,
    val tiers: List<BulkDiscountTier> = emptyList()
) {
    val profitMarginPercent: Double
        get() = if (mrp > 0) ((mrp - sellingPrice) / mrp) * 100.0 else 0.0

    val isOutOfStock: Boolean
        get() = availableStock <= 0

    val isLowStock: Boolean
        get() = availableStock in 1..20
}

data class BulkDiscountTier(
    val minQuantity: Int,
    val discountPercent: Double,
    val unitPrice: Double
)

enum class DeliveryDay {
    MONDAY, WEDNESDAY, SATURDAY
}

data class DeliveryWindow(
    val deliveryDay: DeliveryDay,
    val deliveryDate: LocalDate,
    val cutoffTimestamp: Instant,
    val label: String
)

data class CartItem(
    val product: Product,
    val quantity: Int
) {
    val appliedUnitPrice: Double
        get() {
            val tier = product.tiers
                .filter { quantity >= it.minQuantity }
                .maxByOrNull { it.minQuantity }
            return tier?.unitPrice ?: product.sellingPrice
        }

    val itemTotal: Double
        get() = appliedUnitPrice * quantity
}
```

---

## 3. Bangladesh Mon/Wed/Sat Delivery Scheduler in Kotlin

```kotlin
package com.medichain.app.domain.util

import com.medichain.app.domain.model.DeliveryDay
import com.medichain.app.domain.model.DeliveryWindow
import java.time.*
import java.time.temporal.TemporalAdjusters

object DeliveryScheduler {
    private val DHAKA_ZONE = ZoneId.of("Asia/Dhaka")
    private val CUTOFF_TIME = LocalTime.of(12, 0, 0) // 12:00 PM BST

    fun calculateNextDeliveryWindow(now: Instant = Instant.now()): DeliveryWindow {
        val dhakaDateTime = now.atZone(DHAKA_ZONE)
        val today = dhakaDateTime.toLocalDate()
        val timeNow = dhakaDateTime.toLocalTime()
        val dayOfWeek = dhakaDateTime.dayOfWeek

        val (targetDay, targetDate) = when (dayOfWeek) {
            DayOfWeek.MONDAY -> {
                if (timeNow.isBefore(CUTOFF_TIME)) {
                    DeliveryDay.MONDAY to today
                } else {
                    DeliveryDay.WEDNESDAY to today.plusDays(2)
                }
            }
            DayOfWeek.TUESDAY -> {
                DeliveryDay.WEDNESDAY to today.plusDays(1)
            }
            DayOfWeek.WEDNESDAY -> {
                if (timeNow.isBefore(CUTOFF_TIME)) {
                    DeliveryDay.WEDNESDAY to today
                } else {
                    DeliveryDay.SATURDAY to today.plusDays(3)
                }
            }
            DayOfWeek.THURSDAY -> {
                DeliveryDay.SATURDAY to today.plusDays(2)
            }
            DayOfWeek.FRIDAY -> {
                DeliveryDay.SATURDAY to today.plusDays(1)
            }
            DayOfWeek.SATURDAY -> {
                if (timeNow.isBefore(CUTOFF_TIME)) {
                    DeliveryDay.SATURDAY to today
                } else {
                    DeliveryDay.MONDAY to today.plusDays(2)
                }
            }
            DayOfWeek.SUNDAY -> {
                DeliveryDay.MONDAY to today.plusDays(1)
            }
        }

        val cutoffDateTime = LocalDateTime.of(targetDate, CUTOFF_TIME).atZone(DHAKA_ZONE).toInstant()
        val label = "${targetDay.name.lowercase().replaceFirstChar { it.uppercase() }} Delivery ($targetDate) (Cutoff: 12:00 PM BST)"

        return DeliveryWindow(
            deliveryDay = targetDay,
            deliveryDate = targetDate,
            cutoffTimestamp = cutoffDateTime,
            label = label
        )
    }
}
```

---

## 4. Depot Rack Section Mapping (Sections A through F)

```kotlin
package com.medichain.app.domain.util

object WarehouseDepotUtils {
    fun resolveRackSection(category: String): String {
        val norm = category.trim().lowercase()
        return when {
            norm.contains("syrup") || norm.contains("suspension") || norm.contains("liquid") -> "Rack Section B (Liquids)"
            norm.contains("injection") || norm.contains("infusion") || norm.contains("vial") -> "Rack Section C (Injectables)"
            norm.contains("cream") || norm.contains("ointment") || norm.contains("gel") || norm.contains("lotion") -> "Rack Section D (Topicals)"
            norm.contains("supplement") || norm.contains("vitamin") || norm.contains("powder") -> "Rack Section E (Supplements)"
            norm.contains("ophthalmic") || norm.contains("eye") -> "Rack Section F (Ophthalmic & Eye Care)"
            else -> "Rack Section A (Oral Solids: Tablets & Capsules)"
        }
    }
}
```

---

## 5. Supabase Integration Setup

To connect your Android app to the production database:
1. Add the Supabase BOM in `build.gradle.kts`:
   ```kotlin
   implementation(platform("io.github.jan-tennert.supabase:bom:3.0.0"))
   implementation("io.github.jan-tennert.supabase:postgrest-kt")
   implementation("io.github.jan-tennert.supabase:auth-kt")
   implementation("io.github.jan-tennert.supabase:storage-kt")
   implementation("io.ktor:ktor-client-android:3.0.0")
   ```
2. Initialize Supabase client:
   ```kotlin
   val supabase = createSupabaseClient(
       supabaseUrl = "https://<your-project>.supabase.co",
       supabaseKey = "<your-anon-key>"
   ) {
       install(Postgrest)
       install(Auth)
       install(Storage)
   }
   ```
