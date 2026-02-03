import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { Loader2 } from "lucide-react";

export const JoinGroupDialog = ({ open, onOpenChange, onGroupJoined }) => {
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setIsLoading(true);
    try {
      const { data: conversation } = await api.post(`/chats/${inviteCode.trim()}/join`);

      toast({
        title: "Success",
        description: `Joined group "${conversation.name}"`,
      });

      onGroupJoined(conversation.id);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.error || "Failed to join group",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join a Group</DialogTitle>
          <DialogDescription>
            Enter the group ID to join an existing conversation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleJoin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inviteCode">Group ID</Label>
            <Input
              id="inviteCode"
              placeholder="Enter group ID..."
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              disabled={isLoading}
              className="text-white bg-background/50"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !inviteCode.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Join Group
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
