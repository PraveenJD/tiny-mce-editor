import { FC, useState } from "react";

import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import axios from "axios";

type SelectInputProps = {
  onFileSelect: (val: string) => void;
  setIsEditorLoading: (val: boolean) => void;
};

const SelectInput: FC<SelectInputProps> = ({
  onFileSelect,
  setIsEditorLoading,
}) => {
  const [selectedFile, setSelectedFile] = useState("");

  const handleFileChange = async (event: any) => {
    const fileName = event.target.value; // Get the selected filename
    setSelectedFile(fileName);

    try {
      setIsEditorLoading(true);
      const baseUrl = import.meta.env.BASE_URL;
      const fileUrl = `${baseUrl}files/${fileName}.docx`;

      // Fetch the file from the public directory
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.statusText}`);
      }

      const blob = await response.blob(); // Convert response to Blob
      const file = new File([blob], fileName, {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      // Prepare FormData
      const formData = new FormData();
      formData.append("file", file, file.name);

      // Send to TinyMCE DOCX to HTML API
      const convertResponse = await axios.post(
        "https://importdocx.converter.tiny.cloud/v2/convert/docx-html",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      // Extract converted HTML
      const htmlContent = convertResponse.data;

      // Pass converted HTML to TinyMCE
      onFileSelect(htmlContent.html);
      setIsEditorLoading(false);
    } catch (error) {
      console.error("Error loading document:", error);
    }
  };

  return (
    <FormControl fullWidth>
      <InputLabel id="demo-simple-select-helper-label">Document</InputLabel>
      <Select
        labelId="demo-simple-select-helper-label"
        label="Document"
        value={selectedFile}
        onChange={handleFileChange}
      >
        <MenuItem value="protocol">Protocol Document</MenuItem>
        <MenuItem value="sample">Sample Document</MenuItem>
      </Select>
    </FormControl>
  );
};

export default SelectInput;
