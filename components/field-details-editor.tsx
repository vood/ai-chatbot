'use client';

import React, { useState, useEffect } from 'react';
import type { UIAnnotation } from '@/lib/editor/annotations'; // Assuming UIAnnotation is exported
import type { ContractField } from '@/lib/db/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'; // Assuming Textarea exists or is added
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getContactsForDocument } from '@/actions/index';
import { Check, ChevronsUpDown } from 'lucide-react';
import type { ContractFieldDefinition } from '@/lib/ai/tools/request-contract-fields';

interface FieldDetailsEditorProps {
  annotation: UIAnnotation | null;
  onSave: (
    annotationId: string,
    updatedData: Partial<ContractFieldDefinition>,
  ) => void;
  // onClose is handled by the Sheet now
}

// Type for the fetched contacts
interface ContactOption {
  id: string;
  name: string | null;
}

export const FieldDetailsEditor: React.FC<FieldDetailsEditorProps> = ({
  annotation,
  onSave,
}) => {
  const [fieldName, setFieldName] = useState('');
  const [fieldValue, setFieldValue] = useState('');
  const [contactId, setContactId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // State for contacts list and loading
  const [contactsList, setContactsList] = useState<ContactOption[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  useEffect(() => {
    // Use optional chaining as preferred by linter
    if (annotation?.data) {
      // Use the correct type definition found earlier
      const data = annotation.data as ContractFieldDefinition;
      setFieldName(data.field_name || '');
      setFieldValue(data.field_value || '');
      // Ensure contactId is explicitly string | null
      const newContactId: string | null = data.contact_id ?? null;
      setContactId(newContactId);
      setIsDirty(false); // Reset dirty state when annotation changes

      // Fetch contacts associated with the document ID
      const docId = data.document_id;

      console.log('docId', docId);
      if (docId) {
        setIsLoadingContacts(true);
        // Pass argument as an object
        getContactsForDocument({ documentId: docId })
          .then((contacts) => {
            setContactsList(contacts as ContactOption[]);
          })
          .catch((error) => {
            console.error('Failed to fetch contacts:', error);
            // Handle error appropriately, maybe show a toast
          })
          .finally(() => {
            setIsLoadingContacts(false);
          });
      } else {
        // No document ID found in annotation data
        setContactsList([]);
        setIsLoadingContacts(false);
      }
    } else {
      // Reset state if annotation is null or has no data
      setFieldName('');
      setFieldValue('');
      setContactId(null); // Explicitly set null when resetting
      setIsDirty(false);
      setContactsList([]);
      setIsLoadingContacts(false); // Ensure loading is reset
    }
  }, [annotation]);

  const handleSave = () => {
    if (!annotation || !isDirty) return;

    // Use the correct type and keys for the update payload
    const updatedData: Partial<ContractFieldDefinition> = {
      field_name: fieldName, // Correct key
      field_value: fieldValue, // Correct key
      // We might also want to update is_filled based on fieldValue
      is_filled: !!fieldValue?.trim(),
    };

    // Conditionally add contact_id only if it's a valid string ID (not null)
    if (contactId !== null) {
      updatedData.contact_id = contactId;
    }

    // The previous key deletion logic might be redundant now, but can be kept or removed.
    // Let's remove it for clarity as we are constructing the object carefully.
    /*
    Object.keys(updatedData).forEach(key => {
      if (updatedData[key as keyof typeof updatedData] === undefined || updatedData[key as keyof typeof updatedData] === null) {
        delete updatedData[key as keyof typeof updatedData];
      }
    });
    */

    onSave(annotation.id, updatedData);
    setIsDirty(false);
  };

  const handleInputChange =
    <T extends HTMLInputElement | HTMLTextAreaElement>(
      setter: React.Dispatch<React.SetStateAction<string>>,
    ) =>
    (e: React.ChangeEvent<T>) => {
      setter(e.target.value);
      setIsDirty(true);
    };

  const handleContactChange = (value: string) => {
    // Map the selected value back to the correct state type (string | null)
    setContactId(value);
    setIsDirty(true); // Ensure changes are tracked
  };

  // If no annotation is selected, show a placeholder
  if (!annotation?.data) {
    return (
      <div className="field-details-placeholder p-4 text-center text-muted-foreground">
        <p>Click on a highlighted field in the document to see its details.</p>
      </div>
    );
  }

  const data = annotation.data;
  const fieldDefinitionId =
    'field_definition_id' in data ? (data as any).field_definition_id : data.id;

  return (
    <div className="space-y-4">
      {/* Display non-editable info */}
      {/* Hide ID field */}
      {/* <div className=\"space-y-1\">\n        <Label htmlFor=\"field-id\" className=\"text-xs text-muted-foreground\">ID</Label>\n        <p id=\"field-id\" className=\"text-sm font-mono bg-muted p-1 rounded text-muted-foreground\">{annotation.id}</p>\n      </div> */}
      {/* Hide Definition ID field */}
      {/* <div className=\"space-y-1\">\n         <Label htmlFor=\"field-def-id\" className=\"text-xs text-muted-foreground\">Definition ID</Label>\n        <p id=\"field-def-id\" className=\"text-sm font-mono bg-muted p-1 rounded text-muted-foreground\">{fieldDefinitionId}</p>\n      </div> */}
      <div className="space-y-1">
        <Label htmlFor="field-type" className="text-xs text-muted-foreground">
          Type
        </Label>
        <p id="field-type" className="text-sm">
          {data.field_type || 'N/A'}
        </p>
      </div>

      {/* Contact Selector */}
      <div className="space-y-1">
        <Label htmlFor="field-contact">Contact</Label>
        <Select
          // Map state (null for unassigned, string for ID) to Select's value
          // Use UNASSIGNED_VALUE for null, the ID itself if present, or '' for initial/placeholder state
          value={contactId ?? ''}
          onValueChange={handleContactChange}
          disabled={isLoadingContacts}
        >
          <SelectTrigger id="field-contact">
            <SelectValue
              placeholder={
                isLoadingContacts ? 'Loading...' : 'Select contact...'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {/* Add option for explicitly unassigned */}
            {contactsList.map((contact) => (
              <SelectItem key={contact.id} value={contact.id}>
                {contact.name || contact.id} {/** Show ID if name is null */}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Editable Fields */}
      <div className="space-y-1">
        <Label htmlFor="field-name">Field Name</Label>
        <Input
          id="field-name"
          value={fieldName}
          onChange={handleInputChange(setFieldName)}
          placeholder="Enter field name"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="field-value">Field Value</Label>
        <Textarea
          id="field-value"
          value={fieldValue}
          onChange={handleInputChange(setFieldValue)}
          placeholder={data.placeholder_text || 'Enter field value'}
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Original Placeholder: {data.placeholder_text || 'N/A'}
        </p>
      </div>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={!isDirty}>
        Save Changes
      </Button>
    </div>
  );
};
