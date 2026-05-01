-- Rename seeded testimonial #3 to Pau Olmos
UPDATE "Testimonial"
SET "name" = 'Pau Olmos', "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = 'seed-testimonial-3';
