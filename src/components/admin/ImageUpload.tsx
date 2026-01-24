
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImageUploadProps {
    value?: string | null;
    onChange: (url: string) => void;
    className?: string;
    disabled?: boolean;
}

export function ImageUpload({ value, onChange, className, disabled }: ImageUploadProps) {
    const [loading, setLoading] = useState(false);

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
        disabled: disabled || loading,
    });

    const removeImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange("");
    };

    return (
        <div
            {...getRootProps()}
            className={cn(
                "relative flex flex-col items-center justify-center w-full aspect-video rounded-xl border-2 border-dashed bg-muted/50 cursor-pointer overflow-hidden transition-colors hover:bg-muted/80",
                isDragActive && "border-primary bg-primary/10",
                disabled && "opacity-50 cursor-not-allowed",
                className
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
    );
}
