
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Loader2, Link as LinkIcon, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ImageUploadProps {
    value?: string | null;
    onChange: (url: string) => void;
    className?: string;
    disabled?: boolean;
}

export function ImageUpload({ value, onChange, className, disabled }: ImageUploadProps) {
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<"upload" | "url">("upload");
    const [urlInput, setUrlInput] = useState("");

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setLoading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const { data, error } = await supabase.functions.invoke("optimize-image", {
                body: formData,
            });

            if (error) throw error;

            if (data?.url) {
                onChange(data.url);
                toast.success("Image uploaded and optimized");
            }
        } catch (error) {
            console.error("Upload failed:", error);
            toast.error("Failed to upload image. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [onChange]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "image/jpeg": [],
            "image/png": [],
            "image/webp": [],
        },
        maxFiles: 1,
        disabled: disabled || loading || mode === "url",
    });

    const removeImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange("");
        setUrlInput("");
    };

    const handleUrlSubmit = () => {
        if (!urlInput) return;
        onChange(urlInput);
        toast.success("Image URL set");
    };

    return (
        <div className={cn("space-y-3", className)}>
            <div className="flex bg-muted p-1 rounded-lg w-fit">
                <button
                    type="button"
                    onClick={() => setMode("upload")}
                    className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                        mode === "upload" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    Upload File
                </button>
                <button
                    type="button"
                    onClick={() => setMode("url")}
                    className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                        mode === "url" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    Paste URL
                </button>
            </div>

            {mode === "upload" ? (
                <div
                    {...getRootProps()}
                    className={cn(
                        "relative flex flex-col items-center justify-center w-full aspect-video rounded-xl border-2 border-dashed bg-muted/50 cursor-pointer overflow-hidden transition-colors hover:bg-muted/80",
                        isDragActive && "border-primary bg-primary/10",
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                >
                    <input {...getInputProps()} />
                    {value ? (
                        <>
                            <img
                                src={value}
                                alt="Uploaded"
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                <p className="text-white font-medium">Click or drop to replace</p>
                                <button
                                    onClick={removeImage}
                                    className="absolute top-2 right-2 p-1 rounded-full bg-destructive/80 text-white hover:bg-destructive shadow-sm"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            {loading && (
                                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
                            {loading ? (
                                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                            ) : (
                                <div className="p-3 bg-background rounded-full shadow-sm">
                                    <Upload className="h-6 w-6 text-muted-foreground" />
                                </div>
                            )}
                            <div className="space-y-1">
                                <p className="text-sm font-medium">
                                    {loading ? "Optimizing..." : "Click to upload or drag & drop"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    SVG, PNG, JPG or GIF (max 1200px)
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {value ? (
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-muted border">
                            <img
                                src={value}
                                alt="URL Preview"
                                className="object-cover w-full h-full"
                            />
                            <button
                                onClick={removeImage}
                                className="absolute top-2 right-2 p-1 rounded-full bg-destructive/80 text-white hover:bg-destructive shadow-sm"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <Input
                                placeholder="https://example.com/image.jpg"
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                                disabled={disabled}
                            />
                            <Button onClick={handleUrlSubmit} disabled={!urlInput || disabled}>
                                Set
                            </Button>
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                        Enter a direct link to an image (JPG, PNG, WebP).
                    </p>
                </div>
            )}
        </div>
    );
}
