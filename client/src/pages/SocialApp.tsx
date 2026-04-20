import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useLocation } from "wouter";
import {
  Bell,
  Camera,
  Check,
  CirclePlus,
  Home,
  ImagePlus,
  Loader2,
  LogOut,
  MessageCircle,
  Phone,
  PlayCircle,
  Search,
  Send,
  Settings,
  Share2,
  ShoppingBag,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type AppTab = "feed" | "chat" | "stories" | "live" | "notifications" | "market" | "profile" | "settings";

const topNavItems: { key: AppTab; label: string; icon: typeof Home }[] = [
  { key: "chat", label: "الدردشة", icon: MessageCircle },
  { key: "profile", label: "صفحتي", icon: UserCircle2 },
  { key: "notifications", label: "الإشعارات", icon: Bell },
];

const bottomNavItems: { key: AppTab; label: string; icon: typeof Home }[] = [
  { key: "feed", label: "الرئيسية", icon: Home },
  { key: "live", label: "البث", icon: Video },
  { key: "market", label: "السوق", icon: ShoppingBag },
  { key: "stories", label: "الستوري", icon: PlayCircle },
  { key: "settings", label: "الإعدادات", icon: Settings },
];

const allNavItems = [...topNavItems, ...bottomNavItems];

const panelClass = "rounded-2xl border border-border/80 bg-card/95 shadow-lg backdrop-blur";
const cardHeaderClass = "px-4 py-4 sm:px-6 sm:py-5";

const normalizeLookup = (value?: string | null) =>
  (value ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[-()+]/g, "");

export default function SocialApp() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<AppTab>("feed");
  const [postText, setPostText] = useState("");
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [commentsOpen, setCommentsOpen] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, any[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});
  const [marketForm, setMarketForm] = useState({ name: "", price: "", city: "", category: "other" });
  const [storyForm, setStoryForm] = useState({ mediaUrl: "", mediaType: "image" as "image" | "video" });
  const [storyUploadState, setStoryUploadState] = useState<"idle" | "reading" | "uploading" | "publishing">("idle");
  const [storyFileData, setStoryFileData] = useState<null | {
    fileName: string;
    contentType: string;
    dataBase64: string;
    mediaType: "image" | "video";
  }>(null);
  const [storyPreviewUrl, setStoryPreviewUrl] = useState("");
  const storyLibraryInputRef = useRef<HTMLInputElement | null>(null);
  const storyCameraInputRef = useRef<HTMLInputElement | null>(null);
  const [liveTitle, setLiveTitle] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [importingContacts, setImportingContacts] = useState(false);
  const [importedContactIds, setImportedContactIds] = useState<string[]>([]);
  const [marketRequestOpen, setMarketRequestOpen] = useState(false);
  const [marketRequestTarget, setMarketRequestTarget] = useState<any | null>(null);
  const [marketRequestForm, setMarketRequestForm] = useState({ quantity: "1", notes: "" });

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
  const commentMutation = trpc.feed.comment.useMutation();
  const fetchCommentsMutation = trpc.feed.comments.useMutation();
  const addFriendMutation = trpc.users.addFriend.useMutation();
  const removeFriendMutation = trpc.users.removeFriend.useMutation();
  const createConversationMutation = trpc.chat.createConversation.useMutation();
  const sendMessageMutation = trpc.chat.sendMessage.useMutation();
  const createStoryMutation = trpc.stories.create.useMutation();
  const uploadStoryMutation = trpc.media.upload.useMutation();
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
      return [person.name, person.bio]
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
  const activeTabMeta = allNavItems.find(item => item.key === activeTab) ?? bottomNavItems[0];
  const isBusy =
    createPostMutation.isPending ||
    sendMessageMutation.isPending ||
    uploadStoryMutation.isPending ||
    createStoryMutation.isPending ||
    startLiveMutation.isPending ||
    createMarketMutation.isPending;

  const invalidateCommon = async () => {
    await Promise.all([
      utils.feed.list.invalidate(),
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

  const handleStoryFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.error("اختر صورة أو فيديو فقط");
      return;
    }

    try {
      setStoryUploadState("reading");
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(new Error("تعذر قراءة الملف"));
        reader.readAsDataURL(file);
      });

      const mediaType = file.type.startsWith("video/") ? "video" : "image";
      setStoryFileData({
        fileName: file.name,
        contentType: file.type || (mediaType === "video" ? "video/mp4" : "image/jpeg"),
        dataBase64,
        mediaType,
      });
      setStoryPreviewUrl(URL.createObjectURL(file));
      setStoryForm({ mediaUrl: "", mediaType });
      toast.success(mediaType === "video" ? "تم تجهيز الفيديو للنشر" : "تم تجهيز الصورة للنشر");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر قراءة الملف");
      setStoryFileData(null);
      setStoryPreviewUrl("");
    } finally {
      setStoryUploadState("idle");
    }
  };

  const clearStoryDraft = () => {
    setStoryFileData(null);
    setStoryPreviewUrl("");
    setStoryForm({ mediaUrl: "", mediaType: "image" });
    setStoryUploadState("idle");
  };

  const handleCreateStory = async () => {
    if (!storyFileData || storyUploadState !== "idle") return;

    try {
      setStoryUploadState("uploading");
      const uploaded = await uploadStoryMutation.mutateAsync({
        folder: "stories",
        fileName: storyFileData.fileName,
        contentType: storyFileData.contentType,
        dataBase64: storyFileData.dataBase64,
      });

      setStoryUploadState("publishing");
      await createStoryMutation.mutateAsync({
        mediaUrl: uploaded.url,
        mediaType: storyFileData.mediaType,
      });
      clearStoryDraft();
      toast.success("تم رفع الستوري ونشره بنجاح");
      await utils.stories.list.invalidate();
    } catch (error) {
      setStoryUploadState("idle");
      toast.error(error instanceof Error ? error.message : "تعذر نشر الستوري");
    }
  };

  const handleOpenMarketRequest = (product: any) => {
    setMarketRequestTarget(product);
    setMarketRequestForm({ quantity: "1", notes: "" });
    setMarketRequestOpen(true);
  };

  const handleSubmitMarketRequest = () => {
    const quantity = Number.parseInt(marketRequestForm.quantity.replace(/[^\d]/g, ""), 10);
    if (Number.isNaN(quantity) || quantity <= 0) {
      toast.error("اكتب كمية صحيحة أولاً");
      return;
    }

    toast.success(`تم تجهيز طلب ${quantity} من ${marketRequestTarget?.name ?? "المنتج"}`);
    setMarketRequestOpen(false);
  };

  const handleMarketCommentPlaceholder = (productName: string) => {
    toast.info(`زر التعليق على ${productName} جاهز كواجهة وسيتم ربطه لاحقاً`);
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

  const renderEmpty = (title: string, description: string) => (
    <Card className={panelClass}>
      <CardContent className="px-4 py-8 text-center sm:px-6 sm:py-10">
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
        <CardHeader className={cardHeaderClass}>
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

          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
            <Button className="min-w-fit" variant={post.liked ? "default" : "outline"} size="sm" onClick={() => handleToggleLike(post.id, post.liked)}>
              {post.liked ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              إعجاب {post.likes}
            </Button>
            <Button className="min-w-fit" variant={isCommentsOpen ? "secondary" : "outline"} size="sm" onClick={() => handleToggleComments(post.id)}>
              <MessageCircle className="w-4 h-4" />
              تعليق {post.comments}
            </Button>
            <Button className="min-w-fit" variant="outline" size="sm" onClick={() => toast.info("مشاركة المنشور ستكون متاحة في الخطوة التالية") }>
              <Share2 className="w-4 h-4" />
              مشاركة {post.shares}
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
          <CardHeader className={cardHeaderClass}>
            <CardTitle className="text-lg sm:text-xl">أنشئ منشور جديد</CardTitle>
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
          <CardHeader className={cardHeaderClass}>
            <CardTitle className="text-lg sm:text-xl">أصدقاؤك</CardTitle>
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
          <CardHeader className={cardHeaderClass}>
            <CardTitle className="text-lg sm:text-xl">اقتراحات</CardTitle>
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
          <CardHeader className={cardHeaderClass}>
            <CardTitle className="text-lg sm:text-xl">ابدأ محادثة جديدة</CardTitle>
            <CardDescription>ابحث باسم الشخص أو رقمه، أو استورد دليل الجوال لو المتصفح يدعم ده.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
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
                        <p className="mt-1 text-sm text-muted-foreground">{person.bio || "معلومات التواصل مخفية حفاظاً على الخصوصية"}</p>
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
          <CardHeader className={cardHeaderClass}>
            <CardTitle className="text-lg sm:text-xl">المحادثات</CardTitle>
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

      <Card className={`${panelClass} min-h-[65svh] lg:min-h-[72vh]`}>
        <CardHeader className={cardHeaderClass}>
          <CardTitle className="text-lg sm:text-xl">{selectedConversation?.name ?? "اختر محادثة"}</CardTitle>
          <CardDescription>إرسال واستقبال الرسائل شغال بشكل مباشر من الواجهة.</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-[42svh] flex-col space-y-3 px-4 pb-4 pt-0 sm:min-h-[52vh] sm:px-6 sm:pb-6">
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
        <CardFooter className="flex flex-col gap-3 border-t border-border/70 px-4 pb-4 pt-4 sm:flex-row sm:items-center sm:px-6 sm:pb-6">
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

  const renderStories = () => (
    <div className="space-y-4">
      <Card className={panelClass}>
        <CardHeader className={cardHeaderClass}>
          <CardTitle className="text-lg sm:text-xl">نشر ستوري</CardTitle>
          <CardDescription>اختر صورة أو فيديو من الجهاز، أو افتح الكاميرا، وسيتم تحويل الملف إلى base64 ثم رفعه إلى مجلد stories قبل النشر.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={storyLibraryInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleStoryFileChange}
          />
          <input
            ref={storyCameraInputRef}
            type="file"
            accept="image/*,video/*"
            capture="environment"
            className="hidden"
            onChange={handleStoryFileChange}
          />

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => storyLibraryInputRef.current?.click()} disabled={storyUploadState !== "idle"}>
              <ImagePlus className="w-4 h-4" />
              اختيار صورة أو فيديو
            </Button>
            <Button type="button" variant="outline" onClick={() => storyCameraInputRef.current?.click()} disabled={storyUploadState !== "idle"}>
              <Camera className="w-4 h-4" />
              فتح الكاميرا
            </Button>
            <Button type="button" onClick={handleCreateStory} disabled={!storyFileData || storyUploadState !== "idle"}>
              {(storyUploadState === "uploading" || storyUploadState === "publishing") ? <Loader2 className="w-4 h-4 animate-spin" /> : <CirclePlus className="w-4 h-4" />}
              {storyUploadState === "uploading"
                ? "جارٍ الرفع..."
                : storyUploadState === "publishing"
                  ? "جارٍ النشر..."
                  : "نشر الستوري"}
            </Button>
            <Button type="button" variant="ghost" onClick={clearStoryDraft} disabled={!storyFileData || storyUploadState !== "idle"}>
              مسح الاختيار
            </Button>
          </div>

          <div className="rounded-2xl border border-border/70 bg-background/40 p-4 text-sm text-muted-foreground">
            {storyUploadState === "reading" && "جارٍ قراءة الملف محلياً وتحويله إلى base64..."}
            {storyUploadState === "uploading" && "جارٍ رفع الوسائط إلى مجلد stories... سيتم منع النشر حتى ينتهي الرفع."}
            {storyUploadState === "publishing" && "تم الرفع، وجارٍ إنشاء الستوري الآن..."}
            {storyUploadState === "idle" && (storyFileData ? `الملف الجاهز: ${storyFileData.fileName}` : "لم يتم اختيار ملف بعد.")}
          </div>

          {storyPreviewUrl && (
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
              {storyFileData?.mediaType === "video" ? (
                <video src={storyPreviewUrl} controls className="max-h-72 w-full rounded-xl bg-black object-contain" />
              ) : (
                <img src={storyPreviewUrl} alt="معاينة الستوري" className="max-h-72 w-full rounded-xl object-contain" />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {(storiesQuery.data ?? []).length === 0 && renderEmpty("لا توجد ستوري حالياً", "أضف أول ستوري من أعلى الصفحة.")}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(storiesQuery.data ?? []).map(story => (
          <Card key={story.id} className={panelClass}>
            <CardHeader className={cardHeaderClass}>
              <CardTitle className="text-base">{story.creator}</CardTitle>
              <CardDescription>{story.title} · {story.time}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 min-h-36 flex items-center justify-center text-center overflow-hidden">
                {story.mediaType === "video" ? (
                  <video src={story.mediaUrl} controls className="max-h-60 w-full rounded-xl bg-black object-contain" />
                ) : (
                  <img src={story.mediaUrl} alt={story.title} className="max-h-60 w-full rounded-xl object-cover" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">المشاهدات: {story.views}</p>
              <a href={story.mediaUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">فتح رابط الوسائط</a>
            </CardContent>
            <CardFooter className="px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
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
        <CardHeader className={cardHeaderClass}>
          <CardTitle className="text-lg sm:text-xl">ابدأ بث مباشر</CardTitle>
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
            <CardHeader className={cardHeaderClass}>
              <div className="flex items-center justify-between gap-2">
                <Badge variant={stream.status === "ended" ? "secondary" : "destructive"}>{stream.status === "ended" ? "منتهي" : "مباشر"}</Badge>
                <Badge variant="outline">{stream.viewers} مشاهد</Badge>
              </div>
              <CardTitle className="text-base">{stream.title}</CardTitle>
              <CardDescription>{stream.host} · {stream.startedAt}</CardDescription>
            </CardHeader>
            <CardFooter className="px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
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
      <CardHeader className={cardHeaderClass}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-lg sm:text-xl">الإشعارات</CardTitle>
            <CardDescription>قراءة الإشعارات وتحديث حالتها مباشرة.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
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

  const renderMarket = () => (
    <div className="space-y-4">
      <Card className={panelClass}>
        <CardHeader className={cardHeaderClass}>
          <CardTitle className="text-lg sm:text-xl">نشر منتج جديد</CardTitle>
          <CardDescription>السوق متصل مباشرة بالـ API.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 px-4 pb-4 pt-0 md:grid-cols-2 sm:px-6 sm:pb-6 xl:grid-cols-4">
          <Input value={marketForm.name} onChange={(e) => setMarketForm(current => ({ ...current, name: e.target.value }))} placeholder="اسم المنتج" />
          <Input value={marketForm.price} onChange={(e) => setMarketForm(current => ({ ...current, price: e.target.value }))} placeholder="السعر" />
          <Input value={marketForm.city} onChange={(e) => setMarketForm(current => ({ ...current, city: e.target.value }))} placeholder="المدينة" />
          <Button onClick={handleCreateMarketItem} disabled={!marketForm.name || !marketForm.price || createMarketMutation.isPending}>
            نشر المنتج
          </Button>
        </CardContent>
      </Card>

      {(marketQuery.data ?? []).length === 0 && renderEmpty("لا توجد منتجات منشورة", "جرّب إضافة أول منتج من النموذج بالأعلى.")}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(marketQuery.data ?? []).map(product => (
          <Card key={product.id} className={panelClass}>
            <CardHeader className={cardHeaderClass}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{product.name}</CardTitle>
                  <CardDescription>{product.store}</CardDescription>
                </div>
                <Badge>{product.price}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-border/70 bg-background/40 p-3">
                <p className="font-semibold">{product.sellerName}</p>
                <p className="mt-1 text-sm text-muted-foreground">{product.sellerBio}</p>
                <p className="mt-2 text-xs text-muted-foreground">{product.city} · {product.posted}</p>
              </div>
              <p className="text-sm leading-7">{product.description}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => handleOpenMarketRequest(product)} disabled={product.isMine}>
                  إرسال طلب
                </Button>
                <Button type="button" variant="outline" onClick={() => handleCreateConversation(product.sellerId, product.sellerName)} disabled={!product.canChat}>
                  <MessageCircle className="w-4 h-4" />
                  دردشة
                </Button>
                <Button type="button" variant="secondary" onClick={() => handleMarketCommentPlaceholder(product.name)}>
                  تعليق
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-4">
      <Card className={panelClass}>
        <CardContent className="flex flex-col gap-4 px-4 py-5 sm:px-6 sm:py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border border-border/70">
              <AvatarFallback className="text-2xl">{currentUser?.name?.slice(0, 1) ?? "ي"}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold sm:text-2xl">الملف الشخصي</h2>
              <p className="mt-1 text-base sm:text-lg">{currentUser?.name}</p>
              <p className="text-sm text-muted-foreground">معلومات التواصل مخفية حفاظاً على الخصوصية</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setActiveTab("feed")}>العودة للرئيسية</Button>
            <Button onClick={() => setActiveTab("settings")}>الإعدادات</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className={panelClass}>
          <CardContent className="px-4 py-5 sm:px-6 sm:py-6">
            <p className="text-sm text-muted-foreground">المنشورات</p>
            <p className="mt-2 text-3xl font-bold">{profileStats.posts}</p>
          </CardContent>
        </Card>
        <Card className={panelClass}>
          <CardContent className="px-4 py-5 sm:px-6 sm:py-6">
            <p className="text-sm text-muted-foreground">المشاهدات التقديرية</p>
            <p className="mt-2 text-3xl font-bold">{profileStats.estimatedViews}</p>
          </CardContent>
        </Card>
        <Card className={panelClass}>
          <CardContent className="px-4 py-5 sm:px-6 sm:py-6">
            <p className="text-sm text-muted-foreground">الإعجابات</p>
            <p className="mt-2 text-3xl font-bold">{profileStats.likes}</p>
          </CardContent>
        </Card>
        <Card className={panelClass}>
          <CardContent className="px-4 py-5 sm:px-6 sm:py-6">
            <p className="text-sm text-muted-foreground">التعليقات</p>
            <p className="mt-2 text-3xl font-bold">{profileStats.comments}</p>
          </CardContent>
        </Card>
      </div>

      <Card className={panelClass}>
        <CardHeader className={cardHeaderClass}>
          <CardTitle className="text-lg sm:text-xl">منشورات صفحتي</CardTitle>
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
    <div className="grid gap-4 xl:grid-cols-[1.4fr,1fr]">
      <Card className={panelClass}>
        <CardHeader className={cardHeaderClass}>
          <CardTitle className="text-lg sm:text-xl">المجموعات</CardTitle>
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

      <Card className={panelClass}>
        <CardHeader className={cardHeaderClass}>
          <CardTitle className="text-lg sm:text-xl">الحساب</CardTitle>
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
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-border/80 bg-black/92 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold sm:text-2xl">يامن شات</h1>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">مرحباً {currentUser?.name} · {activeTabMeta.label}</p>
            </div>
            {unreadNotifications > 0 && (
              <Badge className="shrink-0">{unreadNotifications} جديد</Badge>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center">
            {topNavItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;

              return (
                <Button
                  key={item.key}
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                  className="justify-center text-xs sm:text-sm"
                  onClick={() => setActiveTab(item.key)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate">{item.label}</span>
                  {item.key === "notifications" && unreadNotifications > 0 && (
                    <Badge className="mr-1 hidden sm:inline-flex">{unreadNotifications}</Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-3 pb-28 pt-24 sm:space-y-6 sm:px-4 sm:pb-32 sm:pt-28 lg:pb-36">
        {isBusy && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-center gap-3 px-4 py-3 text-sm sm:px-6">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              جارٍ تنفيذ العملية وتحديث البيانات...
            </CardContent>
          </Card>
        )}

        {activeTab === "feed" && renderFeed()}
        {activeTab === "chat" && renderChat()}
        {activeTab === "stories" && renderStories()}
        {activeTab === "live" && renderLive()}
        {activeTab === "notifications" && renderNotifications()}
        {activeTab === "market" && renderMarket()}
        {activeTab === "profile" && renderProfile()}
        {activeTab === "settings" && renderSettings()}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-black/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <div className="mx-auto grid max-w-4xl grid-cols-5 gap-2">
          {bottomNavItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;

            return (
              <Button
                key={item.key}
                size="sm"
                variant={isActive ? "default" : "ghost"}
                className="h-auto flex-col gap-1 rounded-xl px-2 py-2 text-[11px] sm:text-xs"
                onClick={() => setActiveTab(item.key)}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{item.label}</span>
              </Button>
            );
          })}
        </div>
      </nav>

      <Dialog open={marketRequestOpen} onOpenChange={setMarketRequestOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إرسال طلب شراء</DialogTitle>
            <DialogDescription>
              جهّز الكمية والملاحظات للمنتج المختار. الواجهة تفاعلية وجاهزة للربط مع endpoint الطلبات.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
              <p className="font-semibold">{marketRequestTarget?.name ?? "المنتج"}</p>
              <p className="mt-1 text-sm text-muted-foreground">البائع: {marketRequestTarget?.sellerName ?? "—"}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">الكمية</label>
              <Input
                value={marketRequestForm.quantity}
                onChange={(e) => setMarketRequestForm(current => ({ ...current, quantity: e.target.value }))}
                inputMode="numeric"
                placeholder="1"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">ملاحظات</label>
              <Textarea
                value={marketRequestForm.notes}
                onChange={(e) => setMarketRequestForm(current => ({ ...current, notes: e.target.value }))}
                placeholder="أضف تفاصيل الطلب أو وقت التواصل المناسب"
                className="min-h-28"
              />
            </div>

            <Button type="button" className="w-full" onClick={handleSubmitMarketRequest}>
              إرسال الطلب
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
