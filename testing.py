import os
import pandas as pd

# Paths to the folders
pdf_folder = './pdfx'  # Replace with your actual path
csv_file = './output/test.csv'      # Replace with your actual path

# Read the CSV file
df = pd.read_csv(csv_file)

# Get the list of PDF file names (excluding the '.pdf' extension if needed)
pdf_files = [f for f in os.listdir(pdf_folder) if f.lower().endswith('.pdf')]

# Get the 'metadata' column as a set for faster checking
metadata_set = set(df['metadata'].astype(str))

print(len(metadata_set))
print(metadata_set)

print(len(pdf_files))
print(pdf_files)
# Check for missing files


missing_files = [f for f in pdf_files if f not in metadata_set]

# Output the result
if missing_files:
    print("The following PDF files are not listed in the metadata column:")
    for f in missing_files:
        print(f)
else:
    print("All PDF files are listed in the metadata column.")
