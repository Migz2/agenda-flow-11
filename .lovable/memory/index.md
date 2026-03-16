Design system: dark/neon theme with Space Grotesk + Inter fonts, HSL color tokens in index.css.
Auth: email/password via Lovable Cloud, no auto-confirm. Profiles table with auto-trigger on signup.
Tasks table: category column changed from enum to TEXT (fully dynamic custom categories).
Custom categories table: user-created categories with name + hex color.
Portuguese (pt-BR) UI language.
No hardcoded categories - everything user-created via custom_categories table.
Study routine generator creates categories automatically as custom_categories.
