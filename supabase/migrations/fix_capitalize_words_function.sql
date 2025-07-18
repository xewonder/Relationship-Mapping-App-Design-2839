-- Fix missing capitalize_words function
-- This function is being called during authentication process

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS capitalize_words(text);
DROP FUNCTION IF EXISTS public.capitalize_words(text);

-- Create the capitalize_words function that's expected by auth hooks
CREATE OR REPLACE FUNCTION capitalize_words(input_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
IMMUTABLE
AS $$
BEGIN
    -- Handle null input
    IF input_text IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Use PostgreSQL's initcap function to capitalize first letter of each word
    RETURN initcap(input_text);
END;
$$;

-- Also create a version without parameter name for compatibility
CREATE OR REPLACE FUNCTION capitalize_words(text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
IMMUTABLE
AS $$
    SELECT CASE 
        WHEN $1 IS NULL THEN NULL 
        ELSE initcap($1) 
    END;
$$;

-- Grant execute permissions to all relevant roles
GRANT EXECUTE ON FUNCTION capitalize_words(text) TO public;
GRANT EXECUTE ON FUNCTION capitalize_words(text) TO anon;
GRANT EXECUTE ON FUNCTION capitalize_words(text) TO authenticated;
GRANT EXECUTE ON FUNCTION capitalize_words(text) TO service_role;

-- Test the function
SELECT capitalize_words('hello world test') as test_result;

-- Add comment for documentation
COMMENT ON FUNCTION capitalize_words(text) IS 'Capitalizes the first letter of each word in the input text. Used by authentication hooks.';