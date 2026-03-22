
-- Add archived column to conversations
ALTER TABLE public.conversations ADD COLUMN is_archived boolean NOT NULL DEFAULT false;

-- Add delete policy for messages (needed for cascade cleanup)
CREATE POLICY "Users can delete own messages"
ON public.messages
FOR DELETE
TO public
USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()));
