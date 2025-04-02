alter table document add column kind text;

--- rename table from document to documents
alter table document rename to documents;

alter table suggestion rename to suggestions;