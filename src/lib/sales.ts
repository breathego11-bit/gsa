import type { PaymentType } from '@prisma/client'

export interface InstallmentDTO {
    id: string
    order: number
    amount: number          // cents
    due_date: string | null // ISO
    collected: boolean
    collected_at: string | null
}

export interface SaleDTO {
    id: string
    closer_id: string
    customer_first_name: string
    customer_last_name: string
    customer_email: string
    customer_phone: string
    package_name: string
    package_description: string | null
    total_amount: number    // cents
    payment_type: PaymentType
    screenshot_url: string
    sale_date: string       // ISO
    created_at: string
    updated_at: string
    installments: InstallmentDTO[]
    cash_collected: number  // computed: sum of collected installments
}

export interface CreateSaleInput {
    customer_first_name: string
    customer_last_name: string
    customer_email: string
    customer_phone: string
    package_name: string
    package_description?: string | null
    total_amount: number    // cents
    payment_type: PaymentType
    screenshot_url: string
    sale_date: string       // ISO
    // For INSTALLMENTS
    installment_count?: number
    first_installment_amount?: number   // cents
    rest_installment_amount?: number    // cents
}

export interface SalesMetrics {
    cash_collected: number       // cents (sum across all sales filtered by period)
    total_contracted: number     // cents (sum of total_amount of sales in period)
    sales_count: number
    sales_complete: number
    sales_partial: number
    commission: {
        pct: number
        amount: number
        tier_idx: number
        active_tier: { min_amount: number; percentage: number }
        next_tier: { min_amount: number; percentage: number } | null
        distance_to_next: number
    }
}

export function isComplete(sale: SaleDTO): boolean {
    return sale.cash_collected >= sale.total_amount
}
