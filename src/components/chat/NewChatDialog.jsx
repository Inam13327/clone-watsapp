import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search } from "lucide-react";
import api from "@/lib/api";

export const NewChatDialog = ({ open, onOpenChange, onChatCreated }) => {
  const [step, setStep] = useState(1);
  const [chatType, setChatType] = useState('direct'); // 'direct' or 'group'
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setStep(1);
      setChatType('direct');
      setGroupName("");
      setSearchQuery("");
      setSelectedUsers([]);
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    try {
      // Don't fetch if query is empty to avoid showing all users (or maybe show some default?)
      // The user asked to "search any user then show that user", so query is key.
      // But initially showing some users is good UX.
      const query = searchQuery ? `?q=${searchQuery}` : '';
      const { data } = await api.get(`/users/search${query}`);
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: "destructive",
        title: "Search Error",
        description: "Failed to search users. Please check your connection.",
      });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCreateChat = async () => {
    if (selectedUsers.length === 0) return;
    if (chatType === 'group' && !groupName.trim()) return;

    setIsLoading(true);
    try {
      const targetUserId = selectedUsers[0];
      const participants = selectedUsers;

      const { data: conversation } = await api.post('/chats', {
        targetUserId: chatType === 'direct' ? targetUserId : null,
        type: chatType,
        name: chatType === 'group' ? groupName : null,
        participants: chatType === 'group' ? participants : undefined
      });

      toast({
        title: "Success",
        description: "Chat created successfully",
      });

      onChatCreated(conversation.id);
    } catch (error) {
      console.error('Error creating chat:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create chat",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "New Message" : "Select Participants"}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 pt-4">
            <Button
              variant="outline"
              className="w-full justify-start text-left h-auto p-4"
              onClick={() => {
                setChatType('direct');
                setStep(2);
              }}
            >
              <div>
                <div className="font-semibold">Direct Message</div>
                <div className="text-sm text-muted-foreground">
                  Chat with a single person
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-left h-auto p-4"
              onClick={() => {
                setChatType('group');
                setStep(2);
              }}
            >
              <div>
                <div className="font-semibold">Group Chat</div>
                <div className="text-sm text-muted-foreground">
                  Chat with multiple people
                </div>
              </div>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {chatType === 'group' && (
              <div className="space-y-2">
                <Label>Group Name</Label>
                <Input
                  placeholder="Enter group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
                <Label>Search Users</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by username, email or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-white bg-background/50"
                  />
                </div>
              </div>

            <ScrollArea className="h-[200px] border rounded-md p-2">
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                    onClick={() => {
                      if (chatType === 'direct') {
                        setSelectedUsers([user.id]);
                      } else {
                        setSelectedUsers(prev =>
                          prev.includes(user.id)
                            ? prev.filter(id => id !== user.id)
                            : [...prev, user.id]
                        );
                      }
                    }}
                  >
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => {}} // Handled by parent click
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback>
                        {user.username?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{user.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                onClick={handleCreateChat}
                disabled={
                  isLoading ||
                  selectedUsers.length === 0 ||
                  (chatType === 'group' && !groupName.trim())
                }
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create {chatType === 'group' ? 'Group' : 'Chat'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
