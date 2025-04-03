import { FC, useEffect } from "react";
import { Editor } from "@tinymce/tinymce-react";
import axios from "axios";

type TinyMCEEditorProps = {
  setEditorContent: (val: string) => void;
  setSelectedText: (val: string) => void;
  editorRef: any;
  editorContent: string;
};

const TinyMCEEditor: FC<TinyMCEEditorProps> = ({
  setEditorContent,
  editorRef,
  setSelectedText,
  editorContent,
}) => {
  const handleEditorChange = (content: string) => {
    if (
      editorRef.current &&
      content !== editorRef.current.editor.getContent()
    ) {
      setEditorContent(content);
    }
  };

  useEffect(() => {
    if (editorRef.current && typeof editorContent === "string") {
      editorRef.current.editor.setContent(editorContent);
    }
  }, [editorContent]);

  // Function to print either selected content or full editor content
  const printSelectedHTML = () => {
    if (editorRef.current) {
      const editor = editorRef.current.editor;
      const selectedHTML = editor.selection.getContent(); // Get selected HTML

      // If no selection, print the full content
      const contentToPrint = selectedHTML || editor.getContent();

      if (contentToPrint) {
        const printWindow = document.createElement("iframe");
        printWindow.style.position = "absolute";
        printWindow.style.width = "0px";
        printWindow.style.height = "0px";
        printWindow.style.border = "none";
        document.body.appendChild(printWindow);

        const doc =
          printWindow.contentDocument || printWindow.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(`
            <html>
            <head>
              <title>Print</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
              </style>
            </head>
            <body>${contentToPrint}</body>
            </html>
          `);
          doc.close();

          setTimeout(() => {
            printWindow.contentWindow?.print();
            document.body.removeChild(printWindow);
          }, 500);
        }
      } else {
        alert("Editor is empty. Please enter some text to print.");
      }
    }
  };

  // Function to export content to PDF
  const exportToPDF = async () => {
    if (!editorRef.current) return;

    const editor = editorRef.current.editor;
    const content = editor.getContent();

    // Create a temporary hidden container
    const tempContainer = document.createElement("div");
    tempContainer.innerHTML = content;
    tempContainer.style.padding = "20px";
    tempContainer.style.backgroundColor = "#fff";
    tempContainer.style.fontFamily = "Arial, sans-serif";
    tempContainer.style.fontSize = "14px";
    tempContainer.style.color = "#000";
    tempContainer.style.width = "100%";
    tempContainer.style.maxWidth = "794px"; // A4 width in pixels at 96 DPI
    tempContainer.style.lineHeight = "1.5"; // Improve spacing
    tempContainer.style.overflow = "hidden";

    // Ensure proper page breaks for long content
    tempContainer.querySelectorAll("p, div, img, table").forEach((el) => {
      (el as HTMLElement).style.pageBreakInside = "avoid";
    });

    document.body.appendChild(tempContainer);

    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          margin: [10, 10, 10, 10], // Margins for better spacing
          filename: "document.pdf",
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            dpi: 300,
            letterRendering: true,
          }, // High-quality rendering
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(tempContainer)
        .save();
    } catch (error) {
      console.error("PDF export failed:", error);
    } finally {
      document.body.removeChild(tempContainer); // Cleanup
    }
  };

  const exportToWord = () => {
    if (editorRef.current) {
      const editor = editorRef.current.editor;
      const content = `\ufeff<html><body>${editor.getContent()}</body></html>`;
      const blob = new Blob([content], {
        type: "application/msword",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "document.doc";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Function to handle Word file upload and insertion into editor
  const handleWordUpload = async (event: any) => {
    const file = event.target.files?.[0]; // Get the selected file

    if (!file) return;

    try {
      // Create FormData and append the file
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
      setEditorContent(htmlContent.html); // Assuming you pass the HTML to TinyMCE's content
    } catch (error) {
      console.error("Error loading document:", error);
    }
  };

  return (
    <>
      <input
        type="file"
        accept=".docx"
        style={{ display: "none" }}
        onChange={handleWordUpload}
        id="uploadWordFile"
      />
      <Editor
        apiKey="yhot11qrouc4h1dm49vot96dfwacylv1ez9fb6j0lbyibut7"
        onInit={(evt, editor) => {
          console.log(evt);

          editorRef.current = { editor };
        }}
        initialValue={editorContent}
        init={{
          browser_spellcheck: true, // Enables browser's native spell check
          contextmenu: false, // Disables TinyMCE's context menu, allows right-click suggestions
          height: 520,
          menubar: true,
          paste_data_images: true,
          plugins: [
            "advlist",
            "autolink",
            "lists",
            "link",
            "image",
            "charmap",
            "print",
            "preview",
            "anchor",
            "searchreplace",
            "visualblocks",
            "code",
            "fullscreen",
            "insertdatetime",
            "media",
            "table",
            "paste",
            "help",
            "wordcount",
            "emoticons",
            "pagebreak",
            "save",
            "directionality",
            "codesample",
          ],
          toolbar:
            "undo redo | fontselect fontsizeselect formatselect | " +
            "bold italic underline strikethrough | forecolor backcolor | " +
            "alignleft aligncenter alignright alignjustify | " +
            "bullist numlist outdent indent | " +
            "link image media table emoticons pagebreak codesample | " +
            "fullscreen preview | customPrint customPDF | removeformat help | exportToPDF exportToWord | uploadWordFile",
          setup: function (editor: any) {
            // Capture selected text
            editor.on("selectionchange", () => {
              const selectedContent = editor.selection.getContent({
                format: "text",
              });
              setSelectedText(selectedContent);
            });

            // Add TinyMCE buttons
            editor.ui.registry.addButton("customPrint", {
              icon: "print",
              tooltip: "Print",
              onAction: () => printSelectedHTML(),
            });
            editor.ui.registry.addButton("customPDF", {
              icon: "new-document",
              tooltip: "Export to PDF",
              onAction: () => exportToPDF(),
            });
            editor.ui.registry.addButton("exportToWord", {
              icon: "new-document",
              tooltip: "Export to Word",
              onAction: exportToWord,
            });
            editor.ui.registry.addButton("uploadWordFile", {
              icon: "upload",
              tooltip: "Upload Word File",
              onAction: () =>
                document.getElementById("uploadWordFile")?.click(),
            });
          },
        }}
        onEditorChange={handleEditorChange}
      />
    </>
  );
};

export default TinyMCEEditor;
