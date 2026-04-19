import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Bell,
  Bookmark,
  Check,
  CirclePlus,
  Flame,
  Home,
  Link2,
  Loader2,
  LogOut,
  MessageCircle,
  Phone,
  PlayCircle,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShoppingBag,
  Trash2,
  UserCircle2,
  UserPlus,
  Users,
  Video,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type AppTab = "feed" | "chat" | "stories" | "reels" | "live" | "notifications" | "market" | "profile" | "settings";

const navItems: { key: AppTab; label: string; icon: typeof Home }[] = [
  { key: "feed", label: "الرئيسية", icon: Home },
  { key: "chat", label: "الدردشة", icon: MessageCircle },
  { key: "stories", label: "الستوري", icon: PlayCircle },
  { key: "reels", label: "الريلز", icon: Flame },
  { key: "live", label: "البث", icon: Video },
  { key: "notifications", label: "الإشعارات", icon: Bell },
  { key: "market", label: "السوق", icon: ShoppingBag },
  { key: "profile", label: "صفحتي", icon: UserCircle2 },
  { key: "settings", label: "الإعدادات", icon: Settings },
];

const panelClass = "border border-border/80 bg-card/95 shadow-lg backdrop-blur";

const normalizeLookup = (value?: string | null) =>
  (value ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[-()+]/g, "");

type RuntimeMode = "demo" | "production";
type MarketCategory = "all" | "electronics" | "vehicles" | "realestate" | "fashion" | "home" | "other";

const runtimeModeStorageKey = "yamenshat.runtimeMode";

const marketCategories: Array<{ value: MarketCategory; label: string }> = [
  { value: "all", label: "كل الأقسام" },
  { value: "electronics", label: "إلكترونيات" },
  { value: "vehicles", label: "سيارات" },
  { value: "realestate", label: "عقارات" },
  { value: "fashion", label: "أزياء" },
  { value: "home", label: "منزل" },
  { value: "other", label: "أخرى" },
];

const normalizeMarketCategory = (value?: string | null): Exclude<MarketCategory, "all"> => {
  const normalized = (value ?? "").toLowerCase().replace(/[^a-z]/g, "");
  switch (normalized) {
    case "electronics":
      return "electronics";
    case "vehicles":
      return "vehicles";
    case "realestate":
      return "realestate";
    case "fashion":
      return "fashion";
    case "home":
      return "home";
    default:
      return "other";
  }
};

const marketCategoryLabel = (value?: string | null) => {
  switch (normalizeMarketCategory(value)) {
    case "electronics":
      return "إلكترونيات";
    case "vehicles":
      return "سيارات";
    case "realestate":
      return "عقارات";
    case "fashion":
      return "أزياء";
    case "home":
      return "منزل";
    default:
      return "أخرى";
  }
};

const marketStatusLabel = (value?: string | null) => {
  switch ((value ?? "").toLowerCase()) {
    case "sold":
      return "تم البيع";
    case "pending":
      return "قيد الحجز";
    default:
      return "متاح";
  }
};

const demoMarketSeed = [
  {
    id: "demo-market-1",
    name: "iPhone 15 Pro مستعمل",
    price: "42,000 EGP",
    store: "إلكترونيات",
    city: "القاهرة",
    posted: "منذ ساعة",
    description: "نسخة Demo لاختبار السوق والفلترة. الحالة ممتازة مع العلبة الأصلية.",
    category: "electronics",
    status: "available",
  },
  {
    id: "demo-market-2",
    name: "شقة إيجار جديد",
    price: "9,500 EGP",
    store: "عقارات",
    city: "الإسكندرية",
    posted: "منذ 3 ساعات",
    description: "مثال Demo لشقة غرفتين وصالة قريبة من البحر.",
    category: "realestate",
    status: "pending",
  },
  {
    id: "demo-market-3",
    name: "كنبة مودرن",
    price: "6,800 EGP",
    store: "منزل",
    city: "المنصورة",
    posted: "أمس",
    description: "منتج تجريبي للأثاث المنزلي علشان الفلاتر تبقى واضحة في الـ UI.",
    category: "home",
    status: "available",
  },
];

export default function SocialApp() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<AppTab>("feed");
  const [postText, setPostText] = useState("");
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [commentsOpen, setCommentsOpen] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, any[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});
  const [marketForm, setMarketForm] = useState({ name: "", price: "", city: "", category: "other" as Exclude<MarketCategory, "all"> });
  const [marketSearch, setMarketSearch] = useState("");
  const [selectedMarketCategory, setSelectedMarketCategory] = useState<MarketCategory>("all");
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>(() => {
    if (typeof window === "undefined") return "production";
    const storedMode = window.localStorage.getItem(runtimeModeStorageKey);
    return storedMode === "demo" ? "demo" : "production";
  });
  const [demoMarketItems, setDemoMarketItems] = useState(() => [...demoMarketSeed]);
  const [storyForm, setStoryForm] = useState({ mediaUrl: "", mediaType: "image" as "image" | "video" });
  const [reelForm, setReelForm] = useState({ mediaUrl: "", caption: "" });
  const [liveTitle, setLiveTitle] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [importingContacts, setImportingContacts] = useState(false);
  const [importedContactIds, setImportedContactIds] = useState<string[]>([]);

  const { data: currentUser, isLoading: isUserLoading } = trpc.auth.me.useQuery();
  const logoutMutation = trpc.auth.logout.useMutation();

  const feedQuery = trpc.feed.list.useQuery();
  const reelsQuery = trpc.reels.list.useQuery();
  const directoryQuery = trpc.users.directory.useQuery();
  const friendsQuery = trpc.users.friendsList.useQuery(undefined, { enabled: !!currentUser });
  const groupsQuery = trpc.groups.list.useQuery();
  const notificationsQuery = trpc.notifications.list.useQuery();
  const marketQuery = trpc.market.list.useQuery(undefined, { enabled: runtimeMode === "production" });
  const storiesQuery = trpc.stories.list.useQuery();
  const liveQuery = trpc.live.list.useQuery();
  const conversationsQuery = trpc.chat.conversations.useQuery(undefined, { enabled: !!currentUser });
  const messagesQuery = trpc.chat.messages.useQuery(
    { conversationId: selectedConversationId ?? "" },
    { enabled: !!selectedConversationId && !!currentUser }
  );

  const createPostMutation = trpc.feed.create.useMutation();
  const reactMutation = trpc.feed.react.useMutation();
  const commentMutation = trpc.feed.comment.useMutation();
  const fetchCommentsMutation = trpc.feed.comments.useMutation();
  const createReelMutation = trpc.reels.create.useMutation();
  const reactReelMutation = trpc.reels.react.useMutation();
  const commentReelMutation = trpc.reels.comment.useMutation();
  const fetchReelCommentsMutation = trpc.reels.comments.useMutation();
  const saveReelMutation = trpc.reels.toggleSave.useMutation();
  const shareReelMutation = trpc.reels.share.useMutation();
  const followReelAuthorMutation = trpc.reels.followAuthor.useMutation();
  const deleteReelMutation = trpc.reels.remove.useMutation();
  const addFriendMutation = trpc.users.addFriend.useMutation();
  const removeFriendMutation = trpc.users.removeFriend.useMutation();
  const createConversationMutation = trpc.chat.createConversation.useMutation();
  const sendMessageMutation = trpc.chat.sendMessage.useMutation();
  const createStoryMutation = trpc.stories.create.useMutation();
  const viewStoryMutation = trpc.stories.view.useMutation();
  const startLiveMutation = trpc.live.start.useMutation();
  const endLiveMutation = trpc.live.end.useMutation();
  const markNotificationMutation = trpc.notifications.markRead.useMutation();
  const markAllNotificationsMutation = trpc.notifications.markAllRead.useMutation();
  const createMarketMutation = trpc.market.create.useMutation();
  const toggleGroupMutation = trpc.groups.toggleMembership.useMutation();

  useEffect(() => {
    if (!isUserLoading && !currentUser) {
      setLocation("/");
    }
  }, [currentUser, isUserLoading, setLocation]);

  useEffect(() => {
    if (!selectedConversationId && conversationsQuery.data?.length) {
      setSelectedConversationId(conversationsQuery.data[0].id);
    }
  }, [conversationsQuery.data, selectedConversationId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(runtimeModeStorageKey, runtimeMode);
    }
  }, [runtimeMode]);

  const friendIds = useMemo(() => new Set((friendsQuery.data ?? []).map(friend => friend.id)), [friendsQuery.data]);
  const importedContactIdSet = useMemo(() => new Set(importedContactIds), [importedContactIds]);

  const suggestions = useMemo(
    () => (directoryQuery.data ?? []).filter(user => !friendIds.has(user.id)).slice(0, 8),
    [directoryQuery.data, friendIds]
  );

  const searchablePeople = useMemo(() => {
    const people = directoryQuery.data ?? [];
    const searchTerm = normalizeLookup(chatSearch);
    return people.filter(person => {
      if (!searchTerm) return true;
      return [person.name, person.bio, person.email, person.phoneNumber]
        .some(value => normalizeLookup(value).includes(searchTerm));
    });
  }, [directoryQuery.data, chatSearch]);

  const myPosts = useMemo(
    () => (feedQuery.data ?? []).filter(post => post.authorId === currentUser?.id),
    [feedQuery.data, currentUser?.id]
  );

  const profileStats = useMemo(() => {
    const posts = myPosts.length;
    const likes = myPosts.reduce((sum, post) => sum + post.likes, 0);
    const comments = myPosts.reduce((sum, post) => sum + post.comments, 0);
    const shares = myPosts.reduce((sum, post) => sum + post.shares, 0);
    const estimatedViews = likes + comments * 2 + shares * 3 + posts * 5;
    return { posts, likes, comments, shares, estimatedViews };
  }, [myPosts]);

  const unreadNotifications = (notificationsQuery.data ?? []).filter(item => !item.isRead).length;
  const isBusy =
    createPostMutation.isPending ||
    createReelMutation.isPending ||
    sendMessageMutation.isPending ||
    createStoryMutation.isPending ||
    startLiveMutation.isPending ||
    createMarketMutation.isPending;

  const invalidateCommon = async () => {
    await Promise.all([
      utils.feed.list.invalidate(),
      utils.reels.list.invalidate(),
      utils.notifications.list.invalidate(),
      utils.chat.conversations.invalidate(),
      utils.chat.messages.invalidate(),
      utils.users.friendsList.invalidate(),
      utils.users.directory.invalidate(),
      utils.groups.list.invalidate(),
      utils.market.list.invalidate(),
      utils.stories.list.invalidate(),
      utils.live.list.invalidate(),
    ]);
  };

  const loadCommentsForPost = async (postId: string) => {
    try {
      setCommentsLoading(current => ({ ...current, [postId]: true }));
      const comments = await fetchCommentsMutation.mutateAsync({ postId });
      setCommentsByPost(current => ({ ...current, [postId]: comments }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحميل التعليقات");
    } finally {
      setCommentsLoading(current => ({ ...current, [postId]: false }));
    }
  };

  const handleToggleComments = async (postId: string) => {
    const shouldOpen = !commentsOpen[postId];
    setCommentsOpen(current => ({ ...current, [postId]: shouldOpen }));
    if (shouldOpen) {
      await loadCommentsForPost(postId);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      setLocation("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تسجيل الخروج حالياً");
    }
  };

  const handleCreatePost = async () => {
    if (!postText.trim()) return;
    try {
      await createPostMutation.mutateAsync({ content: postText, postType: "text" });
      setPostText("");
      toast.success("تم نشر المنشور بنجاح");
      await utils.feed.list.invalidate();
      setActiveTab("feed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر نشر المنشور");
    }
  };

  const handleToggleLike = async (postId: string, currentlyLiked: boolean) => {
    try {
      await reactMutation.mutateAsync({ postId, currentlyLiked, reactionType: "like" });
      await utils.feed.list.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث الإعجاب");
    }
  };

  const handleAddComment = async (postId: string) => {
    const content = commentText[postId]?.trim();
    if (!content) return;

    try {
      await commentMutation.mutateAsync({ postId, content });
      setCommentText(current => ({ ...current, [postId]: "" }));
      await Promise.all([utils.feed.list.invalidate(), loadCommentsForPost(postId)]);
      setCommentsOpen(current => ({ ...current, [postId]: true }));
      toast.success("تم إضافة التعليق");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إضافة التعليق");
    }
  };

  const handleToggleFriend = async (friendId: string, isFriend: boolean) => {
    try {
      if (isFriend) {
        await removeFriendMutation.mutateAsync({ friendId });
        toast.success("تمت إزالة الصديق");
      } else {
        await addFriendMutation.mutateAsync({ friendId });
        toast.success("تمت إضافة الصديق");
      }
      await Promise.all([utils.users.friendsList.invalidate(), utils.users.directory.invalidate()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث الصداقة");
    }
  };

  const handleCreateConversation = async (participantId: string, name: string) => {
    try {
      const conversation = await createConversationMutation.mutateAsync({
        participantIds: [participantId],
        name,
      });
      toast.success("تم فتح المحادثة");
      await utils.chat.conversations.invalidate();
      setSelectedConversationId(conversation.id);
      setActiveTab("chat");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إنشاء المحادثة");
    }
  };

  const handleImportContacts = async () => {
    const contactsApi = (navigator as any)?.contacts;
    if (!contactsApi?.select) {
      toast.info("استيراد دليل الجوال غير مدعوم في المتصفح الحالي، استخدم البحث باسم الشخص أو رقمه.");
      return;
    }

    try {
      setImportingContacts(true);
      const pickedContacts = await contactsApi.select(["name", "tel", "email"], { multiple: true });
      const directory = directoryQuery.data ?? [];
      const matchedIds = directory
        .filter(person => {
          const personTokens = [person.name, person.phoneNumber, person.email, person.bio]
            .map(normalizeLookup)
            .filter(Boolean);

          return pickedContacts.some((contact: any) => {
            const contactTokens = [
              ...(contact?.name ?? []),
              ...(contact?.tel ?? []),
              ...(contact?.email ?? []),
            ]
              .map(normalizeLookup)
              .filter(Boolean);

            return contactTokens.some((contactToken: string) =>
              personTokens.some(personToken =>
                personToken.includes(contactToken) || contactToken.includes(personToken)
              )
            );
          });
        })
        .map(person => person.id);

      setImportedContactIds(matchedIds);
      if (matchedIds.length) {
        toast.success(`تم العثور على ${matchedIds.length} مستخدم/مستخدمين من دليل الجوال داخل يامن شات`);
      } else {
        toast.info("تم فحص دليل الجوال، لكن لم يتم العثور على تطابقات حالياً.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر قراءة دليل الجوال");
    } finally {
      setImportingContacts(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedConversationId || !chatMessage.trim()) return;
    try {
      await sendMessageMutation.mutateAsync({
        conversationId: selectedConversationId,
        content: chatMessage,
        messageType: "text",
      });
      setChatMessage("");
      await Promise.all([utils.chat.messages.invalidate(), utils.chat.conversations.invalidate()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إرسال الرسالة");
    }
  };

  const handleCreateStory = async () => {
    if (!storyForm.mediaUrl.trim()) return;
    try {
      await createStoryMutation.mutateAsync(storyForm);
      setStoryForm({ mediaUrl: "", mediaType: "image" });
      toast.success("تم نشر الستوري");
      await utils.stories.list.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر نشر الستوري");
    }
  };

  const loadCommentsForReel = async (postId: string) => {
    try {
      setCommentsLoading(current => ({ ...current, [postId]: true }));
      const comments = await fetchReelCommentsMutation.mutateAsync({ postId });
      setCommentsByPost(current => ({ ...current, [postId]: comments }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحميل تعليقات الريل");
    } finally {
      setCommentsLoading(current => ({ ...current, [postId]: false }));
    }
  };

  const handleToggleReelComments = async (postId: string) => {
    const shouldOpen = !commentsOpen[postId];
    setCommentsOpen(current => ({ ...current, [postId]: shouldOpen }));
    if (shouldOpen) {
      await loadCommentsForReel(postId);
    }
  };

  const handleCreateReel = async () => {
    if (!reelForm.mediaUrl.trim()) {
      toast.error("أضف رابط فيديو صالح أولاً");
      return;
    }

    try {
      await createReelMutation.mutateAsync({ mediaUrl: reelForm.mediaUrl.trim(), content: reelForm.caption.trim() });
      setReelForm({ mediaUrl: "", caption: "" });
      toast.success("تم نشر الريل بنجاح");
      await utils.reels.list.invalidate();
      setActiveTab("reels");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر نشر الريل");
    }
  };

  const handleToggleReelLike = async (postId: string, currentlyLiked: boolean) => {
    try {
      await reactReelMutation.mutateAsync({ postId, currentlyLiked, reactionType: "like" });
      await utils.reels.list.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث إعجاب الريل");
    }
  };

  const handleAddReelComment = async (postId: string) => {
    const content = commentText[postId]?.trim();
    if (!content) return;

    try {
      await commentReelMutation.mutateAsync({ postId, content });
      setCommentText(current => ({ ...current, [postId]: "" }));
      await Promise.all([utils.reels.list.invalidate(), loadCommentsForReel(postId)]);
      setCommentsOpen(current => ({ ...current, [postId]: true }));
      toast.success("تم إضافة التعليق على الريل");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إضافة تعليق الريل");
    }
  };

  const handleToggleSaveReel = async (postId: string, currentlySaved: boolean) => {
    try {
      await saveReelMutation.mutateAsync({ postId, currentlySaved });
      toast.success(currentlySaved ? "تم إلغاء حفظ الريل" : "تم حفظ الريل");
      await utils.reels.list.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث حفظ الريل");
    }
  };

  const handleShareReel = async (postId: string, mediaUrl?: string | null) => {
    try {
      await shareReelMutation.mutateAsync({ postId });
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(mediaUrl || window.location.href);
      }
      toast.success("تمت مشاركة الريل ونسخ رابطه");
      await utils.reels.list.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر مشاركة الريل");
    }
  };

  const handleFollowReelAuthor = async (authorId: string, following: boolean) => {
    try {
      await followReelAuthorMutation.mutateAsync({ authorId, following });
      toast.success(following ? "تم إلغاء متابعة صاحب الريل" : "تمت متابعة صاحب الريل");
      await Promise.all([utils.reels.list.invalidate(), utils.users.following.invalidate()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث المتابعة");
    }
  };

  const handleDeleteReel = async (postId: string) => {
    try {
      await deleteReelMutation.mutateAsync({ postId });
      toast.success("تم حذف الريل");
      await utils.reels.list.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حذف الريل");
    }
  };

  const handleViewStory = async (storyId: string, mediaUrl: string) => {
    try {
      await viewStoryMutation.mutateAsync({ storyId });
      window.open(mediaUrl, "_blank", "noopener,noreferrer");
      await utils.stories.list.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر فتح الستوري");
    }
  };

  const handleStartLive = async () => {
    if (!liveTitle.trim()) return;
    try {
      await startLiveMutation.mutateAsync({ title: liveTitle });
      setLiveTitle("");
      toast.success("تم بدء البث");
      await utils.live.list.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر بدء البث");
    }
  };

  const handleEndLive = async (streamId: string) => {
    try {
      await endLiveMutation.mutateAsync({ streamId });
      toast.success("تم إنهاء البث");
      await utils.live.list.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إنهاء البث");
    }
  };

  const handleMarkNotification = async (notificationId: string) => {
    try {
      await markNotificationMutation.mutateAsync({ notificationId });
      await utils.notifications.list.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث الإشعار");
    }
  };

  const handleMarkAllNotifications = async () => {
    try {
      await markAllNotificationsMutation.mutateAsync();
      toast.success("تم تعليم كل الإشعارات كمقروءة");
      await utils.notifications.list.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث الإشعارات");
    }
  };

  const handleCreateMarketItem = async () => {
    if (!marketForm.name || !marketForm.price) return;
    const numericPrice = Number.parseInt(marketForm.price.replace(/[^\d]/g, ""), 10);
    if (Number.isNaN(numericPrice)) {
      toast.error("اكتب سعر رقمي صحيح");
      return;
    }

    if (runtimeMode === "demo") {
      setDemoMarketItems(current => [
        {
          id: `demo-market-${Date.now()}`,
          name: marketForm.name,
          price: `${numericPrice.toLocaleString("en-US")} EGP`,
          store: marketCategoryLabel(marketForm.category),
          city: marketForm.city || "غير محدد",
          posted: "الآن",
          description: `منتج تجريبي مضاف بواسطة ${currentUser?.name ?? "المستخدم"}`,
          category: marketForm.category,
          status: "available",
        },
        ...current,
      ]);
      setMarketForm({ name: "", price: "", city: "", category: "other" });
      toast.success("تم نشر المنتج داخل Demo mode");
      return;
    }

    try {
      await createMarketMutation.mutateAsync({
        title: marketForm.name,
        description: `منتج منشور من ${currentUser?.name ?? "المستخدم"}`,
        price: numericPrice,
        currency: "EGP",
        category: marketForm.category,
        location: marketForm.city || null,
        imageUrls: [],
      });
      setMarketForm({ name: "", price: "", city: "", category: "other" });
      toast.success("تم نشر المنتج");
      await utils.market.list.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر نشر المنتج");
    }
  };

  const handleToggleGroup = async (groupId: string, joined: boolean) => {
    try {
      await toggleGroupMutation.mutateAsync({ groupId, joined });
      toast.success(joined ? "تم مغادرة المجموعة" : "تم الانضمام للمجموعة");
      await utils.groups.list.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث عضوية المجموعة");
    }
  };

  const selectedConversation = useMemo(
    () => (conversationsQuery.data ?? []).find(item => item.id === selectedConversationId) ?? null,
    [conversationsQuery.data, selectedConversationId]
  );

  const marketItems = useMemo(
    () => (runtimeMode === "demo" ? demoMarketItems : (marketQuery.data ?? [])),
    [demoMarketItems, marketQuery.data, runtimeMode]
  );

  const filteredMarketItems = useMemo(() => {
    const searchTerm = normalizeLookup(marketSearch);
    return marketItems.filter(product => {
      const productCategory = normalizeMarketCategory(product.category ?? product.store);
      const matchesCategory = selectedMarketCategory === "all" || productCategory === selectedMarketCategory;
      const matchesSearch = !searchTerm || [product.name, product.store, product.city, product.description, product.category]
        .some(value => normalizeLookup(value).includes(searchTerm));
      return matchesCategory && matchesSearch;
    });
  }, [marketItems, marketSearch, selectedMarketCategory]);

  const handleToggleRuntimeMode = (checked: boolean) => {
    const nextMode = checked ? "production" : "demo";
    setRuntimeMode(nextMode);
    toast.success(nextMode === "production" ? "تم تفعيل Production mode" : "تم التحويل إلى Demo mode");
  };

  const renderEmpty = (title: string, description: string) => (
    <Card className={panelClass}>
      <CardContent className="py-10 text-center">
        <p className="text-lg font-semibold">{title}</p>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  const renderPostCard = (post: any, mode: "feed" | "profile" = "feed") => {
    const postComments = commentsByPost[post.id] ?? [];
    const isCommentsOpen = !!commentsOpen[post.id];
    const isLoadingComments = !!commentsLoading[post.id];

    return (
      <Card key={post.id} className={panelClass}>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>{post.author.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base">{post.author}</CardTitle>
                <CardDescription>
                  {post.handle} · {post.time}
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary">{mode === "profile" ? "من صفحتي" : post.category}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="leading-8 whitespace-pre-wrap">{post.text}</p>
          {post.mediaUrl && (
            <a href={post.mediaUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline underline-offset-4">
              فتح الوسائط المرفقة
            </a>
          )}

          <div className="grid gap-2 sm:grid-cols-3">
            <Button variant={post.liked ? "default" : "outline"} size="sm" onClick={() => handleToggleLike(post.id, post.liked)}>
              {post.liked ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              إعجاب {post.likes}
            </Button>
            <Button variant={isCommentsOpen ? "secondary" : "outline"} size="sm" onClick={() => handleToggleComments(post.id)}>
              <MessageCircle className="w-4 h-4" />
              تعليقات {post.comments}
            </Button>
            <Badge variant="outline" className="justify-center py-2 text-sm">
              مشاركات {post.shares}
            </Badge>
          </div>

          {isCommentsOpen && (
            <div className="rounded-2xl border border-border/70 bg-background/50 p-3 space-y-3">
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {isLoadingComments && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري تحميل التعليقات...
                  </div>
                )}

                {!isLoadingComments && !postComments.length && (
                  <p className="text-sm text-muted-foreground">لا توجد تعليقات بعد، ابدأ أول تعليق.</p>
                )}

                {postComments.map(comment => (
                  <div key={comment.id} className={`rounded-2xl border px-3 py-2 ${comment.mine ? "border-primary/40 bg-primary/10" : "border-border/60 bg-card/70"}`}>
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <p className="text-sm font-semibold">{comment.author}</p>
                      <p className="text-xs text-muted-foreground">{comment.time}</p>
                    </div>
                    <p className="text-sm leading-7">{comment.text}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                <Input
                  value={commentText[post.id] ?? ""}
                  onChange={(e) => setCommentText(current => ({ ...current, [post.id]: e.target.value }))}
                  placeholder="اكتب تعليقك هنا"
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment(post.id)}
                />
                <Button onClick={() => handleAddComment(post.id)} disabled={!commentText[post.id]?.trim() || commentMutation.isPending}>
                  <Send className="w-4 h-4" />
                  إرسال
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isUserLoading || (!currentUser && !isUserLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderFeed = () => (
    <div className="grid gap-4 xl:grid-cols-[1.6fr,1fr]">
      <div className="space-y-4">
        <Card className={panelClass}>
          <CardHeader>
            <CardTitle>أنشئ منشور جديد</CardTitle>
            <CardDescription>الواجهة أصبحت داكنة بالكامل مع التعليقات التفاعلية والإحصاءات المحدثة.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={postText} onChange={(e) => setPostText(e.target.value)} placeholder="بماذا تفكر الآن؟" className="min-h-28" />
            <Button onClick={handleCreatePost} disabled={!postText.trim() || createPostMutation.isPending}>
              {createPostMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CirclePlus className="w-4 h-4" />}
              نشر الآن
            </Button>
          </CardContent>
        </Card>

        {(feedQuery.data ?? []).length === 0 && renderEmpty("لا توجد منشورات حالياً", "ابدأ أول منشور ليظهر في الرئيسية وصفحتك الشخصية.")}
        {(feedQuery.data ?? []).map(post => renderPostCard(post))}
      </div>

      <div className="space-y-4">
        <Card className={panelClass}>
          <CardHeader>
            <CardTitle>أصدقاؤك</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(friendsQuery.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">لسه ماعندكش أصدقاء على الحساب ده.</p>}
            {(friendsQuery.data ?? []).map(friend => (
              <div key={friend.id} className="rounded-xl border border-border/70 p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{friend.name}</p>
                  <p className="text-sm text-muted-foreground">{friend.bio}</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <Button size="sm" variant="outline" onClick={() => handleCreateConversation(friend.id, friend.name)}>
                    <MessageCircle className="w-4 h-4" />
                    دردشة
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleToggleFriend(friend.id, true)}>
                    إزالة
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className={panelClass}>
          <CardHeader>
            <CardTitle>اقتراحات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.map(user => (
              <div key={user.id} className="rounded-xl border border-border/70 p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.bio}</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  <Button size="sm" onClick={() => handleToggleFriend(user.id, false)}>
                    <UserPlus className="w-4 h-4" />
                    إضافة
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleCreateConversation(user.id, user.name)}>
                    <MessageCircle className="w-4 h-4" />
                    محادثة
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderChat = () => (
    <div className="grid gap-4 lg:grid-cols-[350px,1fr]">
      <div className="space-y-4">
        <Card className={panelClass}>
          <CardHeader>
            <CardTitle>ابدأ محادثة جديدة</CardTitle>
            <CardDescription>ابحث باسم الشخص أو رقمه، أو استورد دليل الجوال لو المتصفح يدعم ده.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  placeholder="ابحث عن شخص بالاسم أو الرقم"
                  className="pr-10"
                />
              </div>
              <Button variant="outline" onClick={handleImportContacts} disabled={importingContacts}>
                {importingContacts ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                دليل الجوال
              </Button>
            </div>

            <div className="space-y-2 max-h-[24rem] overflow-y-auto pr-1">
              {searchablePeople.map(person => {
                const isFriend = friendIds.has(person.id);
                const imported = importedContactIdSet.has(person.id);
                return (
                  <div key={person.id} className="rounded-2xl border border-border/70 p-3 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{person.name}</p>
                          {imported && <Badge>من دليل الجوال</Badge>}
                          <Badge variant="secondary">على يامن شات</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{person.phoneNumber || person.email || person.bio}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      {!isFriend && (
                        <Button size="sm" variant="secondary" onClick={() => handleToggleFriend(person.id, false)}>
                          <UserPlus className="w-4 h-4" />
                          إضافة صديق
                        </Button>
                      )}
                      <Button size="sm" onClick={() => handleCreateConversation(person.id, person.name)}>
                        <MessageCircle className="w-4 h-4" />
                        دردشة الآن
                      </Button>
                    </div>
                  </div>
                );
              })}

              {!searchablePeople.length && (
                <p className="text-sm text-muted-foreground">لا يوجد أشخاص مطابقون للبحث حالياً.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={panelClass}>
          <CardHeader>
            <CardTitle>المحادثات</CardTitle>
            <CardDescription>الأشخاص ظاهرين فوق بعض مثل تطبيقات التواصل المعتادة.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(conversationsQuery.data ?? []).map(conversation => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => setSelectedConversationId(conversation.id)}
                className={`w-full rounded-xl border p-3 text-right transition ${selectedConversationId === conversation.id ? "border-primary bg-primary/10" : "border-border/70 hover:bg-muted/30"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{conversation.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{conversation.time}</p>
                  </div>
                  {conversation.unread > 0 && <Badge>{conversation.unread}</Badge>}
                </div>
              </button>
            ))}

            {!(conversationsQuery.data ?? []).length && (
              <p className="text-sm text-muted-foreground">ابدأ محادثة من قائمة الأشخاص بالأعلى.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className={`${panelClass} min-h-[72vh]`}>
        <CardHeader>
          <CardTitle>{selectedConversation?.name ?? "اختر محادثة"}</CardTitle>
          <CardDescription>إرسال واستقبال الرسائل شغال بشكل مباشر من الواجهة.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 min-h-[52vh] flex flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {(messagesQuery.data ?? []).map(message => (
              <div key={message.id} className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.mine ? "mr-auto bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                {!message.mine && <p className="text-xs mb-1 opacity-80">{message.senderName}</p>}
                <p className="leading-7">{message.text}</p>
                <p className="text-xs mt-2 opacity-70">{message.time}</p>
              </div>
            ))}
            {selectedConversationId && !(messagesQuery.data ?? []).length && !messagesQuery.isLoading && (
              <p className="text-sm text-muted-foreground">لا توجد رسائل بعد، ابدأ أول رسالة الآن.</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="border-t border-border/70 pt-4 gap-3 flex-wrap">
          <Input
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder={selectedConversationId ? "اكتب رسالتك..." : "اختر محادثة أولاً"}
            disabled={!selectedConversationId}
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          />
          <Button onClick={handleSendMessage} disabled={!selectedConversationId || !chatMessage.trim() || sendMessageMutation.isPending}>
            <Send className="w-4 h-4" />
            إرسال
          </Button>
        </CardFooter>
      </Card>
    </div>
  );

  const renderReels = () => (
    <div className="space-y-4">
      <Card className={panelClass}>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>إدارة الريلز</CardTitle>
              <CardDescription>رفع الريلز وتشغيلها والتفاعل الكامل معها من الويب مثل باقي تطبيقات التواصل.</CardDescription>
            </div>
            <Button variant="outline" onClick={async () => { await utils.reels.list.invalidate(); toast.success("تم تحديث قائمة الريلز"); }}>
              <RefreshCw className="w-4 h-4" />
              تحديث الريلز
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-[1.2fr,0.8fr]">
          <Input
            value={reelForm.mediaUrl}
            onChange={(e) => setReelForm(current => ({ ...current, mediaUrl: e.target.value }))}
            placeholder="https://example.com/reel.mp4"
          />
          <Button onClick={handleCreateReel} disabled={!reelForm.mediaUrl.trim() || createReelMutation.isPending}>
            {createReelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CirclePlus className="w-4 h-4" />}
            نشر الريل
          </Button>
          <Textarea
            value={reelForm.caption}
            onChange={(e) => setReelForm(current => ({ ...current, caption: e.target.value }))}
            placeholder="اكتب وصف الريل والهاشتاجات مثل #طبخ #سفر"
            className="lg:col-span-2 min-h-24"
          />
        </CardContent>
      </Card>

      {!(reelsQuery.data ?? []).length && renderEmpty("لا توجد ريلز حالياً", "أضف أول ريل فيديو وسيظهر هنا مع أدوات الإعجاب والحفظ والتعليقات.")}
      <div className="grid gap-4 xl:grid-cols-2">
        {(reelsQuery.data ?? []).map(reel => {
          const reelComments = commentsByPost[reel.id] ?? [];
          const isCommentsOpen = !!commentsOpen[reel.id];
          const isLoadingComments = !!commentsLoading[reel.id];

          return (
            <Card key={reel.id} className={`${panelClass} overflow-hidden`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base">{reel.author}</CardTitle>
                      <Badge variant="secondary">{reel.handle}</Badge>
                      {reel.isTrending && <Badge className="bg-rose-600 hover:bg-rose-600"><Flame className="w-3 h-3 ml-1" />رائج</Badge>}
                    </div>
                    <CardDescription>{reel.time}</CardDescription>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    {reel.authorId !== currentUser?.id && (
                      <Button size="sm" variant={reel.followingAuthor ? "secondary" : "outline"} onClick={() => handleFollowReelAuthor(reel.authorId, reel.followingAuthor)}>
                        {reel.followingAuthor ? "إلغاء المتابعة" : "متابعة"}
                      </Button>
                    )}
                    {reel.canDelete && (
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteReel(reel.id)}>
                        <Trash2 className="w-4 h-4" />
                        حذف
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-hidden rounded-3xl border border-border/70 bg-black">
                  <video src={reel.mediaUrl ?? undefined} controls playsInline loop muted preload="metadata" className="h-[28rem] w-full bg-black object-cover" />
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                  <Badge variant="outline">🔥 {reel.trendScore}</Badge>
                  <Badge variant="outline">❤ {reel.likes}</Badge>
                  <Badge variant="outline">💬 {reel.comments}</Badge>
                  <Badge variant="outline">↗ {reel.shares}</Badge>
                  {reel.hashtags.map((tag: string) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                </div>

                <p className="leading-8 whitespace-pre-wrap">{reel.caption || "بدون وصف"}</p>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <Button variant={reel.liked ? "default" : "outline"} size="sm" onClick={() => handleToggleReelLike(reel.id, reel.liked)}>
                    {reel.liked ? <Check className="w-4 h-4" /> : <Flame className="w-4 h-4" />}
                    إعجاب {reel.likes}
                  </Button>
                  <Button variant={isCommentsOpen ? "secondary" : "outline"} size="sm" onClick={() => handleToggleReelComments(reel.id)}>
                    <MessageCircle className="w-4 h-4" />
                    تعليقات {reel.comments}
                  </Button>
                  <Button variant={reel.saved ? "default" : "outline"} size="sm" onClick={() => handleToggleSaveReel(reel.id, reel.saved)}>
                    <Bookmark className="w-4 h-4" />
                    {reel.saved ? "محفوظ" : "حفظ"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleShareReel(reel.id, reel.mediaUrl)}>
                    <Link2 className="w-4 h-4" />
                    مشاركة
                  </Button>
                </div>

                {isCommentsOpen && (
                  <div className="rounded-2xl border border-border/70 bg-background/50 p-3 space-y-3">
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {isLoadingComments && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          جاري تحميل التعليقات...
                        </div>
                      )}

                      {!isLoadingComments && !reelComments.length && (
                        <p className="text-sm text-muted-foreground">لا توجد تعليقات على هذا الريل حتى الآن.</p>
                      )}

                      {reelComments.map(comment => (
                        <div key={comment.id} className={`rounded-2xl border px-3 py-2 ${comment.mine ? "border-primary/40 bg-primary/10" : "border-border/60 bg-card/70"}`}>
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold">{comment.author}</p>
                            <p className="text-xs text-muted-foreground">{comment.time}</p>
                          </div>
                          <p className="text-sm leading-7">{comment.text}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                      <Input
                        value={commentText[reel.id] ?? ""}
                        onChange={(e) => setCommentText(current => ({ ...current, [reel.id]: e.target.value }))}
                        placeholder="اكتب تعليقك على الريل"
                        onKeyDown={(e) => e.key === "Enter" && handleAddReelComment(reel.id)}
                      />
                      <Button onClick={() => handleAddReelComment(reel.id)} disabled={!commentText[reel.id]?.trim() || commentReelMutation.isPending}>
                        <Send className="w-4 h-4" />
                        إرسال
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderStories = () => (
    <div className="space-y-4">
      <Card className={panelClass}>
        <CardHeader>
          <CardTitle>نشر ستوري</CardTitle>
          <CardDescription>أضف رابط صورة أو فيديو وسيتم إنشاء ستوري عبر الـ API.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={storyForm.mediaUrl} onChange={(e) => setStoryForm(current => ({ ...current, mediaUrl: e.target.value }))} placeholder="https://example.com/image.jpg" />
          <div className="flex gap-2 flex-wrap">
            <Button variant={storyForm.mediaType === "image" ? "default" : "outline"} onClick={() => setStoryForm(current => ({ ...current, mediaType: "image" }))}>صورة</Button>
            <Button variant={storyForm.mediaType === "video" ? "default" : "outline"} onClick={() => setStoryForm(current => ({ ...current, mediaType: "video" }))}>فيديو</Button>
            <Button onClick={handleCreateStory} disabled={!storyForm.mediaUrl.trim() || createStoryMutation.isPending}>
              {createStoryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CirclePlus className="w-4 h-4" />}
              نشر ستوري
            </Button>
          </div>
        </CardContent>
      </Card>

      {(storiesQuery.data ?? []).length === 0 && renderEmpty("لا توجد ستوري حالياً", "أضف أول ستوري من أعلى الصفحة.")}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(storiesQuery.data ?? []).map(story => (
          <Card key={story.id} className={panelClass}>
            <CardHeader>
              <CardTitle className="text-base">{story.creator}</CardTitle>
              <CardDescription>{story.title} · {story.time}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 min-h-36 flex items-center justify-center text-center">
                <div>
                  <p className="font-medium">{story.mediaType === "video" ? "معاينة ستوري فيديو" : "معاينة ستوري صورة"}</p>
                  <p className="text-sm text-muted-foreground mt-2">المشاهدات: {story.views}</p>
                </div>
              </div>
              <a href={story.mediaUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">فتح رابط الوسائط</a>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleViewStory(story.id, story.mediaUrl)} className="w-full">
                مشاهدة الستوري
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderLive = () => (
    <div className="space-y-4">
      <Card className={panelClass}>
        <CardHeader>
          <CardTitle>ابدأ بث مباشر</CardTitle>
          <CardDescription>بدء وإنهاء البث مربوطين بالـ API.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input value={liveTitle} onChange={(e) => setLiveTitle(e.target.value)} placeholder="عنوان البث" className="flex-1" />
          <Button onClick={handleStartLive} disabled={!liveTitle.trim() || startLiveMutation.isPending}>
            {startLiveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
            ابدأ الآن
          </Button>
        </CardContent>
      </Card>

      {(liveQuery.data ?? []).length === 0 && renderEmpty("لا يوجد بث مباشر حالياً", "لما تبدأ بث جديد هيظهر هنا فوراً.")}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(liveQuery.data ?? []).map(stream => (
          <Card key={stream.id} className={panelClass}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <Badge variant={stream.status === "ended" ? "secondary" : "destructive"}>{stream.status === "ended" ? "منتهي" : "مباشر"}</Badge>
                <Badge variant="outline">{stream.viewers} مشاهد</Badge>
              </div>
              <CardTitle className="text-base">{stream.title}</CardTitle>
              <CardDescription>{stream.host} · {stream.startedAt}</CardDescription>
            </CardHeader>
            <CardFooter>
              {stream.canEnd ? (
                <Button variant="outline" className="w-full" onClick={() => handleEndLive(stream.id)}>
                  إنهاء البث
                </Button>
              ) : (
                <Button variant="secondary" className="w-full" disabled>
                  عرض الحالة فقط
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderNotifications = () => (
    <Card className={panelClass}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle>الإشعارات</CardTitle>
            <CardDescription>قراءة الإشعارات وتحديث حالتها مباشرة.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge>{unreadNotifications} غير مقروء</Badge>
            <Button variant="outline" onClick={handleMarkAllNotifications} disabled={markAllNotificationsMutation.isPending || !(notificationsQuery.data ?? []).length}>
              تعليم الكل كمقروء
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!(notificationsQuery.data ?? []).length && <p className="text-sm text-muted-foreground">لا توجد إشعارات حالياً.</p>}
        {(notificationsQuery.data ?? []).map(item => (
          <div key={item.id} className="rounded-2xl border border-border/70 p-4 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold">{item.title}</p>
                <Badge variant="secondary">{item.type}</Badge>
                {!item.isRead && <Badge>جديد</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
              <p className="text-xs text-muted-foreground mt-2">{item.time}</p>
            </div>
            <Button variant="ghost" onClick={() => handleMarkNotification(item.id)} disabled={item.isRead || markNotificationMutation.isPending}>
              تمّت القراءة
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  const renderMarket = () => {
    const hasFilters = Boolean(marketSearch) || selectedMarketCategory !== "all";
    const emptyTitle = hasFilters
      ? "مفيش منتجات مطابقة للفلترة الحالية"
      : runtimeMode === "production"
        ? "لا توجد منتجات منشورة حالياً"
        : "لسه ما فيش منتجات تجريبية كفاية";
    const emptyDescription = hasFilters
      ? "امسح البحث أو غيّر الـ category علشان تشوف منتجات تانية."
      : runtimeMode === "production"
        ? "راجع بيانات الـ API أو أضف منتج جديد من النموذج الموجود بالأعلى."
        : "تقدر تضيف منتجات محلية للتجربة أو تبدّل إلى Production mode من الإعدادات.";

    return (
      <div className="space-y-4">
        <Card className={panelClass}>
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle>Marketplace</CardTitle>
                <CardDescription>فلترة فعليّة بالبحث والـ category مع دعم Demo و Production.</CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={runtimeMode === "production" ? "default" : "secondary"}>
                  {runtimeMode === "production" ? "Production" : "Demo"}
                </Badge>
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (runtimeMode === "production") {
                      await utils.market.list.invalidate();
                      toast.success("تم تحديث المنتجات من السيرفر");
                    } else {
                      toast.success("أنت في Demo mode والبيانات المعروضة محلية");
                    }
                  }}
                >
                  <RefreshCw className="w-4 h-4" />
                  تحديث
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-[1.2fr,220px]">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pr-10"
                value={marketSearch}
                onChange={(e) => setMarketSearch(e.target.value)}
                placeholder="ابحث باسم المنتج أو الوصف أو المدينة"
              />
            </div>
            <Select value={selectedMarketCategory} onValueChange={(value) => setSelectedMarketCategory(value as MarketCategory)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="فلترة حسب القسم" />
              </SelectTrigger>
              <SelectContent>
                {marketCategories.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className={panelClass}>
          <CardHeader>
            <CardTitle>نشر منتج جديد</CardTitle>
            <CardDescription>
              {runtimeMode === "production"
                ? "المنتج هيتبعت مباشرة للـ API الحقيقي."
                : "المنتج هيتحفظ محلياً داخل Demo mode لاختبار الواجهة بسرعة."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Input value={marketForm.name} onChange={(e) => setMarketForm(current => ({ ...current, name: e.target.value }))} placeholder="اسم المنتج" />
            <Input value={marketForm.price} onChange={(e) => setMarketForm(current => ({ ...current, price: e.target.value }))} placeholder="السعر" />
            <Input value={marketForm.city} onChange={(e) => setMarketForm(current => ({ ...current, city: e.target.value }))} placeholder="المدينة" />
            <Select value={marketForm.category} onValueChange={(value) => setMarketForm(current => ({ ...current, category: value as Exclude<MarketCategory, "all"> }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="القسم" />
              </SelectTrigger>
              <SelectContent>
                {marketCategories.filter(category => category.value !== "all").map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleCreateMarketItem} disabled={!marketForm.name || !marketForm.price || createMarketMutation.isPending}>
              نشر المنتج
            </Button>
          </CardContent>
        </Card>

        {!filteredMarketItems.length ? (
          <Card className={panelClass}>
            <CardContent className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border/70 bg-background/60">
                <ShoppingBag className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold">{emptyTitle}</p>
              <p className="mt-2 text-sm text-muted-foreground">{emptyDescription}</p>
              <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
                <Button variant="outline" onClick={() => { setMarketSearch(""); setSelectedMarketCategory("all"); }}>
                  مسح الفلاتر
                </Button>
                <Button variant="secondary" onClick={() => setActiveTab("settings")}>
                  إعدادات التشغيل
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredMarketItems.map(product => (
              <Card key={product.id} className={panelClass}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{product.name}</CardTitle>
                      <CardDescription>{product.store}</CardDescription>
                    </div>
                    <Badge variant="secondary">{marketCategoryLabel(product.category ?? product.store)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{product.price}</Badge>
                    <Badge variant="outline">{marketStatusLabel(product.status)}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">📍 {product.city}</p>
                  <p className="text-sm text-muted-foreground">🕒 {product.posted}</p>
                  <p className="text-sm leading-7">{product.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderProfile = () => (
    <div className="space-y-4">
      <Card className={panelClass}>
        <CardContent className="py-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border border-border/70">
              <AvatarFallback className="text-2xl">{currentUser?.name?.slice(0, 1) ?? "ي"}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">الملف الشخصي</h2>
              <p className="mt-1 text-lg">{currentUser?.name}</p>
              <p className="text-sm text-muted-foreground">{currentUser?.email ?? currentUser?.phone_number ?? "بدون وسيلة تواصل"}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setActiveTab("feed")}>العودة للرئيسية</Button>
            <Button onClick={() => setActiveTab("settings")}>الإعدادات</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className={panelClass}>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">المنشورات</p>
            <p className="mt-2 text-3xl font-bold">{profileStats.posts}</p>
          </CardContent>
        </Card>
        <Card className={panelClass}>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">المشاهدات التقديرية</p>
            <p className="mt-2 text-3xl font-bold">{profileStats.estimatedViews}</p>
          </CardContent>
        </Card>
        <Card className={panelClass}>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">الإعجابات</p>
            <p className="mt-2 text-3xl font-bold">{profileStats.likes}</p>
          </CardContent>
        </Card>
        <Card className={panelClass}>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">التعليقات</p>
            <p className="mt-2 text-3xl font-bold">{profileStats.comments}</p>
          </CardContent>
        </Card>
      </div>

      <Card className={panelClass}>
        <CardHeader>
          <CardTitle>منشورات صفحتي</CardTitle>
          <CardDescription>تعرض الصفحة منشوراتك بنفس أسلوب الرئيسية مع الإحصاءات والتعليقات.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!myPosts.length && <p className="text-sm text-muted-foreground">لا توجد منشورات لك حالياً. انشر أول منشور من الرئيسية وسيظهر هنا مباشرة.</p>}
          {myPosts.map(post => renderPostCard(post, "profile"))}
        </CardContent>
      </Card>
    </div>
  );

  const renderSettings = () => (
    <div className="grid gap-4 xl:grid-cols-[1.2fr,1fr]">
      <Card className={panelClass}>
        <CardHeader>
          <CardTitle>المجموعات</CardTitle>
          <CardDescription>الانضمام والمغادرة شغالين من الواجهة.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(groupsQuery.data ?? []).map(group => (
            <div key={group.id} className="rounded-2xl border border-border/70 p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{group.name}</p>
                <p className="text-sm text-muted-foreground">{group.description}</p>
                <p className="text-xs text-muted-foreground mt-1">{group.members}</p>
              </div>
              <Button variant={group.joined ? "secondary" : "default"} onClick={() => handleToggleGroup(group.id, group.joined)}>
                {group.joined ? "مغادرة" : "انضمام"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className={panelClass}>
          <CardHeader>
            <CardTitle>Feature toggle</CardTitle>
            <CardDescription>تبديل واضح بين Demo و Production mode للتجربة أو التشغيل الحقيقي.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/70 p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">Demo / Production mode</p>
                <p className="text-sm text-muted-foreground mt-1">
                  التبديل شغال من نفس صفحة الإعدادات وبيأثر على سوق الويب مباشرة.
                </p>
              </div>
              <Switch checked={runtimeMode === "production"} onCheckedChange={handleToggleRuntimeMode} />
            </div>
            <div className="rounded-2xl bg-muted/30 p-4 text-sm text-muted-foreground">
              الوضع الحالي: <span className="font-semibold text-foreground">{runtimeMode === "production" ? "Production" : "Demo"}</span>.
              {runtimeMode === "production"
                ? " البيانات جاية من الـ API الحقيقي."
                : " البيانات المعروضة حالياً تجريبية ومحلية لتسهيل العرض والاختبار."}
            </div>
          </CardContent>
        </Card>

        <Card className={panelClass}>
          <CardHeader>
            <CardTitle>الحساب</CardTitle>
            <CardDescription>بيانات الحساب الحالي وإجراءات التحكم.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-border/70 p-4">
              <p className="font-semibold">{currentUser?.name}</p>
              <p className="text-sm text-muted-foreground mt-1">{currentUser?.email ?? currentUser?.phone_number ?? "بدون وسيلة تواصل"}</p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setActiveTab("profile")}>
              <UserCircle2 className="w-4 h-4" />
              الملف الشخصي
            </Button>
            <Button variant="outline" className="w-full" onClick={async () => { await invalidateCommon(); toast.success("تم تحديث البيانات من السيرفر"); }}>
              تحديث كل البيانات
            </Button>
            <Button variant="destructive" className="w-full" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-black/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold">يامن شات</h1>
            <p className="text-sm text-muted-foreground">مرحباً {currentUser?.name}، تم تحسين الواجهة بالثيم الأسود مع الريلز والملف الشخصي والدردشة والتعليقات.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <Button key={item.key} variant={activeTab === item.key ? "default" : "outline"} onClick={() => setActiveTab(item.key)}>
                  <Icon className="w-4 h-4" />
                  {item.label}
                  {item.key === "notifications" && unreadNotifications > 0 && <Badge className="mr-1">{unreadNotifications}</Badge>}
                </Button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        {isBusy && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-3 flex items-center gap-3 text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              جارٍ تنفيذ العملية وتحديث البيانات...
            </CardContent>
          </Card>
        )}

        {activeTab === "feed" && renderFeed()}
        {activeTab === "chat" && renderChat()}
        {activeTab === "stories" && renderStories()}
        {activeTab === "reels" && renderReels()}
        {activeTab === "live" && renderLive()}
        {activeTab === "notifications" && renderNotifications()}
        {activeTab === "market" && renderMarket()}
        {activeTab === "profile" && renderProfile()}
        {activeTab === "settings" && renderSettings()}
      </main>
    </div>
  );
}
