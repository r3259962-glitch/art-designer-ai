# سفر‌دوست

نسخه رایگان سایت سفر‌دوست؛ یک شبکه برای آشنایی مسافران و افراد محلی.

## معماری

- Frontend: HTML/CSS/JavaScript
- Hosting: GitHub Pages
- Backend/Database/Auth/Storage: Supabase Free
- اطلاعات تماس خصوصی در جدول `private_contacts` نگهداری می‌شود.
- کلید `service_role` هرگز نباید در مرورگر قرار بگیرد.

## راه‌اندازی Supabase

1. یک پروژه رایگان در Supabase بسازید.
2. محتوای `supabase-schema.sql` را در SQL Editor اجرا کنید.
3. مقدار Project URL و کلید anon/publishable را در `supabase-config.js` قرار دهید.
4. در Authentication، روش Email را فعال کنید.
5. سپس سایت را از GitHub Pages منتشر کنید.

## وضعیت فعلی

رابط کاربری و مدل داده آماده است. فرم پروفایل حداقل یک راه ارتباطی می‌خواهد؛ شماره تلفن اختیاری است. اطلاعات تماس عمومی نمایش داده نمی‌شود.

## مرحله بعد

اتصال واقعی Authentication، پروفایل‌ها، درخواست دوستی، پیام‌رسانی و Storage عکس‌ها باید با URL و کلید پروژه Supabase فعال شود.