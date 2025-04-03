import { useEffect, useRef, useState } from "react";

import { Button, Skeleton } from "@mui/material";

import logo from "../../assets/images/novartis_logo.svg";
import SelectInput from "../../components/SelectInput";
import TinyMCEEditor from "../../components/TinyMCEEditor";
// import axios from "axios";

const HomePage = () => {
  // const [batchId, setBatchId] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [connected, setConnected] = useState(false);
  const [correctedSentence, setCorrectedSentence] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const editorRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // const generateBatchId = async () => {
    //   try {
    //     const response = await axios.get("/generate_batch_id", {
    //       headers: {
    //         "Content-Type": "application/json",
    //       },
    //     });

    //     setBatchId(response.data?.batch_id);
    //   } catch (error) {
    //     console.error("Unable to generate Batch ID", error);
    //   }
    // };

    // generateBatchId();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const timeout = setTimeout(() => {
      if (selectedText) {
        getSuggestions();
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [selectedText]);

  const handleReplaceText = () => {
    if (editorRef.current && selectedText) {
      const editor = editorRef.current.editor;

      // Get selected HTML content (preserves styles like bold, font size, etc.)
      const selectedHTML = editor.selection.getContent({ format: "html" });

      if (selectedHTML) {
        // Replace content while preserving styles
        const replacedHTML = selectedHTML.replace(
          selectedHTML,
          `<span>${correctedSentence}</span>`
        );
        editor.selection.setContent(replacedHTML, { format: "raw" });
      }

      setSelectedText("");
    }
  };

  const getSuggestions = () => {
    const url = `https://smart-suggest.azurewebsites.net/ws/rag/stream/1/kesimpta`;

    if (!connected) {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log("WebSocket connection established.");

        setIsLoading(true);
        setConnected(true);
        ws.send(selectedText);
      };

      ws.onmessage = (event: MessageEvent) => {
        const responseData = JSON.parse(event.data);

        if (responseData?.corrected_sentence) {
          setCorrectedSentence(responseData?.corrected_sentence);
        }

        wsRef.current = null;
        setIsLoading(false);
        setConnected(false);
      };

      ws.onerror = (error: Event) => {
        console.error("WebSocket error:", error);
      };

      ws.onclose = (event: CloseEvent) => {
        console.log("WebSocket closed:", event);

        setIsLoading(false);
        setConnected(false);
      };

      wsRef.current = ws;
    } else {
      if (wsRef.current) {
        wsRef.current.send(selectedText);
      }
    }
  };

  return (
    <div className="h-screen">
      <div className="h-16 flex justify-between items-center px-8 border-b border-gray-300 shadow mb-2">
        <img src={logo} alt="Novartis" width={200} />
        <h4 className="text-2xl font-semibold">Editor</h4>
      </div>

      <div className="flex gap-5 px-3">
        <div className="w-[70%]">
          <TinyMCEEditor
            setEditorContent={setEditorContent}
            setSelectedText={setSelectedText}
            editorRef={editorRef}
            editorContent={editorContent}
          />
        </div>
        <div className="flex-1 pt-24">
          <SelectInput
            onFileSelect={(content) => {
              if (typeof content !== "string") {
                console.error("Invalid content format:", content);
                return;
              }

              setEditorContent(content);

              if (editorRef.current && editorRef.current.editor) {
                editorRef.current.editor.setContent(content);
              }
            }}
          />

          {correctedSentence && selectedText ? (
            <div className="mt-10">
              <h6 className="text-base font-semibold">Suggestion:</h6>
              <div className="border border-gray-300 px-3 py-2 rounded shadow flex flex-col gap-2">
                <div className="text-xs">
                  <span className="font-semibold">Issue: </span>
                  {selectedText}
                </div>
                <div
                  className={`text-xs w-full ${
                    isLoading ? "flex items-center gap-1" : ""
                  }`}
                >
                  <span className="font-semibold">Suggestions: </span>

                  {isLoading ? (
                    <Skeleton width={300} height={17} />
                  ) : (
                    correctedSentence
                  )}
                </div>
                <Button
                  sx={{ textTransform: "none" }}
                  size="small"
                  variant="contained"
                  color="success"
                  className="w-24"
                  onClick={handleReplaceText}
                >
                  Replace
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
