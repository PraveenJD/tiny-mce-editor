import { FC } from "react";
import { Editor } from "@tinymce/tinymce-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import mammoth from "mammoth";

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
    if (editorRef.current) {
      const editor = editorRef.current.editor;
      const content = editor.getContent();
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = content;
      document.body.appendChild(tempDiv);

      html2canvas(tempDiv, { scale: 2 }).then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const imgWidth = 190;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
        pdf.save("document.pdf");
        document.body.removeChild(tempDiv);
      });
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
  const handleWordUpload = (event: any) => {
    const file = event.target.files[0];
    if (
      file &&
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const reader = new FileReader();
      reader.onload = function (e: any) {
        const arrayBuffer = e.target.result;
        mammoth
          .convertToHtml({ arrayBuffer })
          .then((result: any) => {
            const content = result.value; // The HTML content with styles and layout

            // Insert the content into TinyMCE
            if (editorRef.current) {
              const editor = editorRef.current.editor;
              editor.setContent(content);
            }
          })
          .catch((err: any) =>
            console.error("Error extracting Word file:", err)
          );
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert("Please upload a valid Word file.");
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
          height: 600,
          menubar: true,
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
          content_style:
            "body { font-family:Arial,Helvetica,sans-serif; font-size:14px }",
        }}
        onEditorChange={handleEditorChange}
      />
    </>
  );
};

export default TinyMCEEditor;
