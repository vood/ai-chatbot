update workspaces 
    set default_context_length = 32000 
where default_context_length is null 
or default_context_length = 0 
or default_context_length < 32000;