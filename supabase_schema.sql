-- TABEL: grade_keys
-- Digunakan untuk menyimpan kunci jawaban GradeMaster dengan proteksi password

CREATE TABLE IF NOT EXISTS public.grade_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key_name TEXT UNIQUE NOT NULL,
    answers JSONB NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: Jika ingin menggunakan Row Level Security (RLS) di masa depan,
-- Anda dapat mengaktifkannya di sini. Untuk saat ini, kita menggunakan 
-- password-logic di sisi client untuk membatasi akses muat data.
ALTER TABLE public.grade_keys ENABLE ROW LEVEL SECURITY;

-- Policy dasar: Izinkan akses anonim untuk demo (karena logic password ada di JS)
-- PENTING: Untuk produksi, sebaiknya perketat policy ini!
CREATE POLICY "Allow anonymous read/write" ON public.grade_keys
    FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);
