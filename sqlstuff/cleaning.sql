--SELECT * FROM documents 
--WHERE content ILIKE '%Ήταν η παλιά συνταγή, που χρησιμοποιούσαν κατά την επιδημία της πανούκλας%';  

-- Or remove non-UTF-8 characters entirely
--UPDATE documents
--SET content = convert_from(convert_to(content, 'UTF8'), 'UTF8');

--UPDATE documents
--SET content = REGEXP_REPLACE(content, '', '', 'g');



--DELETE FROM documents
--WHERE CHAR_LENGTH(content) < 50;