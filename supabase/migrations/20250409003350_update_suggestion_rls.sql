-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Allow users to read their own suggestions" ON suggestion;
DROP POLICY IF EXISTS "Allow users to insert their own suggestions" ON suggestion;
DROP POLICY IF EXISTS "Allow users to update their own suggestions" ON suggestion;
DROP POLICY IF EXISTS "Allow users to delete their own suggestions" ON suggestion;

-- Create new policies that allow both suggestion creators and document owners to access suggestions
CREATE POLICY "Allow users to read their own suggestions or suggestions on their documents" 
ON suggestion FOR SELECT 
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM documents 
    WHERE documents.id = suggestion.document_id 
    AND documents.created_at = suggestion.document_created_at
    AND documents.user_id = auth.uid()
  )
);

CREATE POLICY "Allow users to insert suggestions on any document they can access" 
ON suggestion FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM documents 
    WHERE documents.id = suggestion.document_id 
    AND documents.created_at = suggestion.document_created_at
    AND (documents.user_id = auth.uid() OR user_id = auth.uid())
  )
);

CREATE POLICY "Allow users to update their own suggestions" 
ON suggestion FOR UPDATE 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow document owners to update suggestions on their documents" 
ON suggestion FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM documents 
    WHERE documents.id = suggestion.document_id 
    AND documents.created_at = suggestion.document_created_at
    AND documents.user_id = auth.uid()
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM documents 
    WHERE documents.id = suggestion.document_id 
    AND documents.created_at = suggestion.document_created_at
    AND documents.user_id = auth.uid()
  )
);

CREATE POLICY "Allow users to delete their own suggestions" 
ON suggestion FOR DELETE 
USING (user_id = auth.uid());

CREATE POLICY "Allow document owners to delete suggestions on their documents" 
ON suggestion FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM documents 
    WHERE documents.id = suggestion.document_id 
    AND documents.created_at = suggestion.document_created_at
    AND documents.user_id = auth.uid()
  )
);
