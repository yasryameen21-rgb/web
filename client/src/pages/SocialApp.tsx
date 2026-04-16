import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Bell,
  Check,
  CirclePlus,
  Home,
  Loader2,
  LogOut,
  MessageCircle,
  PlayCircle,
  Send,
  Settings,
  ShoppingBag,
  UserPlus,
  Users,
  Video,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";


type AppTab = "feed" | "chat" | "stories" | "live" | "notifications" | "market" | "settings";


const navItems: { key: AppTab; label: string; icon: typeof Home }[] = [
  { key: "feed", label: "المنشورات", icon: Home },
  { key: "chat", label: "الدردشة", icon: MessageCircle },
  { key: "stories", label: "الستوري", icon: PlayCircle },
  { key: "live", label: "البث", icon: Video },
  { key: "notifications", label: "الإشعارات", icon: Bell },
  { key: "market", label: "السوق", icon: ShoppingBag },
  { key: "settings", label: "المجموعات والحساب", icon: Settings },
];


export default function SocialApp() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<AppTab>("feed");
  const [postText, setPostText] = useState("");
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [marketForm, setMarketForm] = useState({ name: "", price: "", city: "", category: "other" });
  const [storyForm, setStoryForm] = useState({ mediaUrl: "", mediaType: "image" as "image" | "video" });
  const [liveTitle, setLiveTitle] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);


  const { data: currentUser, isLoading: isUserLoading } = trpc.auth.me.useQuery();
  const logoutMutation = trpc.auth.logout.useMutation();


  const feedQuery = trpc.feed.list.useQuery();
  const directoryQuery = trpc.users.directory.useQuery();
  const friendsQuery = trpc.users.friendsList.useQuery(undefined, { enabled: !!currentUser });
  const groupsQuery = trpc.groups.list.useQuery();
  const notificationsQuery = trpc.notifications.list.useQuery();
  const marketQuery = trpc.market.list.useQuery();
  const storiesQuery = trpc.stories.list.useQuery();
  const liveQuery = trpc.live.list.useQuery();
  const conversationsQuery = trpc.chat.conversations.useQuery(undefined, { enabled: !!currentUser });
  const messagesQuery = trpc.chat.messages.useQuery(
    { conversationId: selectedConversationId ?? "" },
    { enabled: !!selectedConversationId && !!currentUser }
  );


  const createPostMutation = trpc.feed.create.useMutation();
  const reactMutation = trpc.feed.react.useMutation();
