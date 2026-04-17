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
  Phone,
  PlayCircle,
  Search,
  Send,
  Settings,
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
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type AppTab = "feed" | "chat" | "stories" | "live" | "notifications" | "market" | "profile" | "settings";

const navItems: { key: AppTab; label: string; icon: typeof Home }[] = [
  { key: "feed", label: "الرئيسية", icon: Home },
  { key: "chat", label: "الدردشة", icon: MessageCircle },
  { key: "stories", label: "الستوري", icon: PlayCircle },
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
  const [liveTitle, setLiveTitle] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [importingContacts, setImportingContacts] = useState(false);
  const [importedContactIds, setImportedContactIds] = useState<string[]>([]);

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
    sendMessageMutation.isPending ||
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

  const renderMarket = () => (
    <div className="space-y-4">
      <Card className={panelClass}>
        <CardHeader>
          <CardTitle>نشر منتج جديد</CardTitle>
          <CardDescription>السوق متصل مباشرة بالـ API.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
            <CardHeader>
              <CardTitle className="text-base">{product.name}</CardTitle>
              <CardDescription>{product.store}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Badge>{product.price}</Badge>
              <p className="text-sm text-muted-foreground">{product.city}</p>
              <p className="text-sm text-muted-foreground">{product.posted}</p>
              <p className="text-sm leading-7">{product.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

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
    <div className="grid gap-4 xl:grid-cols-[1.4fr,1fr]">
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
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-black/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold">يامن شات</h1>
            <p className="text-sm text-muted-foreground">مرحباً {currentUser?.name}، تم تحسين الواجهة بالثيم الأسود والملف الشخصي والدردشة والتعليقات.</p>
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
        {activeTab === "live" && renderLive()}
        {activeTab === "notifications" && renderNotifications()}
        {activeTab === "market" && renderMarket()}
        {activeTab === "profile" && renderProfile()}
        {activeTab === "settings" && renderSettings()}
      </main>
    </div>
  );
}
