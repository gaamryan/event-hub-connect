import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/header";
import { Bookmark } from "lucide-react";

const Saved = () => {
  // For now, show empty state. Will integrate with saved_events table
  return (
    <AppLayout>
      <PageHeader title="Saved" subtitle="Your bookmarked events" />

      <div className="p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <div className="w-20 h-20 rounded-full bg-secondary mx-auto flex items-center justify-center mb-4">
            <Bookmark className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No saved events</h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Tap the bookmark icon on any event to save it here for later.
          </p>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Saved;
