-- Create a function to update any existing tables if needed
CREATE OR REPLACE FUNCTION update_relationship_types_for_ex_spouse() 
RETURNS void AS $$
BEGIN
    -- This function can be extended in the future if we need to update existing relationships
    -- For now, it just ensures the function exists
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT update_relationship_types_for_ex_spouse();

-- Drop the function after use
DROP FUNCTION update_relationship_types_for_ex_spouse();