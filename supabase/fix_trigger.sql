-- ============================================================
-- FIX: Trigger handle_new_user robusto
-- Problema: corría en schema 'auth' y no encontraba 'profiles'
-- Solución: SET search_path = public + manejo de excepciones
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public          -- <-- esto es lo que faltaba
AS $func$
BEGIN
  BEGIN
    INSERT INTO profiles (id, alias)
    VALUES (
      NEW.id,
      COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'alias'), ''),
        split_part(NEW.email, '@', 1)
      )
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Si algo falla, no bloqueamos el signup; el frontend crea el perfil como fallback
    RAISE WARNING 'handle_new_user: no se pudo crear perfil para % — %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$func$;

-- Re-crear el trigger (por si no existía o estaba mal)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
