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
    if (editorRef.current) {
      const editor = editorRef.current.editor;
      let content = editor.getContent();

      // Convert images to base64
      content = await embedImagesAsBase64(content);

      // Create a hidden container with the content
      const printableElement = document.createElement("div");
      printableElement.innerHTML = content;
      printableElement.style.padding = "20px";
      printableElement.style.fontFamily = "Arial, sans-serif";
      printableElement.style.lineHeight = "1.8"; // Ensure proper spacing
      printableElement.style.wordWrap = "break-word";
      printableElement.style.whiteSpace = "normal";

      // Fix table spacing
      printableElement.querySelectorAll("p, div, table").forEach((element) => {
        (element as HTMLElement).style.pageBreakInside = "avoid";
        (element as HTMLElement).style.pageBreakAfter = "auto";
        (element as HTMLElement).style.marginBottom = "10px";
      });

      // Fix image spacing
      printableElement.querySelectorAll("img").forEach((img) => {
        (img as HTMLElement).style.display = "block"; // Prevent inline overlap
        (img as HTMLElement).style.maxWidth = "100%"; // Prevent stretching
        (img as HTMLElement).style.height = "auto"; // Maintain aspect ratio
        (img as HTMLElement).style.pageBreakInside = "avoid";
        (img as HTMLElement).style.margin = "10px 0"; // Center images and add spacing
      });

      document.body.appendChild(printableElement);

      // Dynamically import html2pdf
      const html2pdf = (await import("html2pdf.js")).default;

      html2pdf()
        .from(printableElement)
        .set({
          margin: 0.5,
          filename: "document.pdf",
          image: { type: "jpeg", quality: 1.0 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: true,
            letterRendering: true,
          },
          jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
        })
        .save()
        .then(() => {
          document.body.removeChild(printableElement);
        })
        .catch((err: any) => {
          console.error("PDF Export failed:", err);
          document.body.removeChild(printableElement);
        });
    }
  };

  const exportToWord = async () => {
    if (editorRef.current) {
      const editor = editorRef.current.editor;
      let content = editor.getContent();

      // Convert image src URLs to base64
      content = await embedImagesAsBase64(content);

      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' 
              xmlns:w='urn:schemas-microsoft-com:office:word' 
              xmlns='http://www.w3.org/TR/REC-html40'>
          <head><meta charset='utf-8'><title>Export HTML to Word</title></head>
          <body>${content}</body>
        </html>`;

      const blob = new Blob(["\ufeff" + htmlContent], {
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

  const embedImagesAsBase64 = async (html: string) => {
    const container = document.createElement("div");
    container.innerHTML = html;
    const imgElements = container.querySelectorAll("img");

    const toBase64 = (img: HTMLImageElement): Promise<void> =>
      new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous"; // Important for CORS
        image.src = img.src;

        image.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = image.width;
          canvas.height = image.height;

          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(image, 0, 0);
            try {
              const dataURL = canvas.toDataURL("image/png");
              img.setAttribute("src", dataURL);
              resolve();
            } catch (err) {
              reject(err);
            }
          } else {
            reject("Canvas context is null");
          }
        };

        image.onerror = reject;
      });

    await Promise.all(Array.from(imgElements).map((img) => toBase64(img)));
    return container.innerHTML;
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
