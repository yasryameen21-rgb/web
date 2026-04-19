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
  const commentMutation = trpc.feed.comment.useMutation();
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
  const suggestions = useMemo(
    () => (directoryQuery.data ?? []).filter(user => !friendIds.has(user.id)).slice(0, 8),
    [directoryQuery.data, friendIds]
  );

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
      utils.groups.list.invalidate(),
      utils.market.list.invalidate(),
      utils.stories.list.invalidate(),
      utils.live.list.invalidate(),
    ]);
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
      toast.success("تم نشر المنشور من الـ API");
      await utils.feed.list.invalidate();
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
      toast.success("تم إضافة التعليق");
      await utils.feed.list.invalidate();
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
      toast.success("تم إنشاء المحادثة");
      await utils.chat.conversations.invalidate();
      setSelectedConversationId(conversation.id);
      setActiveTab("chat");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إنشاء المحادثة");
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
      toast.success("تم بدء البث من الـ API");
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

  if (isUserLoading || (!currentUser && !isUserLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderFeed = () => (
    <div className="grid gap-4 xl:grid-cols-[1.6fr,1fr]">
      <div className="space-y-4">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>أنشئ منشور جديد</CardTitle>
            <CardDescription>الويب هنا بقى API-first بالكامل للمنشورات والتعليقات والإعجابات.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={postText} onChange={(e) => setPostText(e.target.value)} placeholder="بماذا تفكر الآن؟" className="min-h-28" />
            <Button onClick={handleCreatePost} disabled={!postText.trim() || createPostMutation.isPending}>
              {createPostMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CirclePlus className="w-4 h-4" />}
              نشر الآن
            </Button>
          </CardContent>
        </Card>

        {(feedQuery.data ?? []).map(post => (
          <Card key={post.id} className="border-0 shadow-md">
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
                <Badge variant="secondary">{post.category}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="leading-7">{post.text}</p>
              {post.mediaUrl && (
                <a href={post.mediaUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                  فتح الوسائط المرفقة
                </a>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant={post.liked ? "default" : "outline"} size="sm" onClick={() => handleToggleLike(post.id, post.liked)}>
                  {post.liked ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  إعجاب {post.likes}
                </Button>
                <Badge variant="outline">تعليقات {post.comments}</Badge>
                <Badge variant="outline">مشاركات {post.shares}</Badge>
              </div>
              <div className="flex gap-2">
                <Input
                  value={commentText[post.id] ?? ""}
                  onChange={(e) => setCommentText(current => ({ ...current, [post.id]: e.target.value }))}
                  placeholder="اكتب تعليقاً سريعاً"
                />
                <Button onClick={() => handleAddComment(post.id)} disabled={!commentText[post.id]?.trim() || commentMutation.isPending}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>أصدقاؤك</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(friendsQuery.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">لسه ماعندكش أصدقاء على الحساب ده.</p>}
            {(friendsQuery.data ?? []).map(friend => (
              <div key={friend.id} className="rounded-xl border p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{friend.name}</p>
                  <p className="text-sm text-muted-foreground">{friend.bio}</p>
                </div>
                <div className="flex gap-2">
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

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>اقتراحات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.map(user => (
              <div key={user.id} className="rounded-xl border p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.bio}</p>
                </div>
                <Button size="sm" onClick={() => handleToggleFriend(user.id, false)}>
                  <UserPlus className="w-4 h-4" />
                  إضافة
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderChat = () => (
    <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>المحادثات</CardTitle>
          <CardDescription>القائمة والرسائل شغالة مباشرة من الـ API.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(conversationsQuery.data ?? []).map(conversation => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => setSelectedConversationId(conversation.id)}
              className={`w-full rounded-xl border p-3 text-right transition ${selectedConversationId === conversation.id ? "border-primary bg-primary/10" : "hover:bg-muted/60"}`}
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
            <p className="text-sm text-muted-foreground">ابدأ محادثة من قائمة الأصدقاء أو الاقتراحات.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md min-h-[70vh]">
        <CardHeader>
          <CardTitle>{selectedConversation?.name ?? "اختر محادثة"}</CardTitle>
          <CardDescription>إرسال واستقبال الرسائل من الـ API مباشرة.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 min-h-[50vh]">
          {(messagesQuery.data ?? []).map(message => (
            <div key={message.id} className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.mine ? "mr-auto bg-primary text-primary-foreground" : "bg-secondary"}`}>
              {!message.mine && <p className="text-xs mb-1 opacity-80">{message.senderName}</p>}
              <p>{message.text}</p>
              <p className="text-xs mt-2 opacity-70">{message.time}</p>
            </div>
          ))}
          {selectedConversationId && !(messagesQuery.data ?? []).length && !messagesQuery.isLoading && (
            <p className="text-sm text-muted-foreground">لا توجد رسائل بعد، ابدأ أول رسالة الآن.</p>
          )}
        </CardContent>
        <CardFooter className="border-t pt-4 gap-3 flex-wrap">
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
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>نشر ستوري</CardTitle>
          <CardDescription>أضف رابط صورة أو فيديو وسيتم إنشاء ستوري عبر الـ API.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={storyForm.mediaUrl} onChange={(e) => setStoryForm(current => ({ ...current, mediaUrl: e.target.value }))} placeholder="https://example.com/image.jpg" />
          <div className="flex gap-2">
            <Button variant={storyForm.mediaType === "image" ? "default" : "outline"} onClick={() => setStoryForm(current => ({ ...current, mediaType: "image" }))}>صورة</Button>
            <Button variant={storyForm.mediaType === "video" ? "default" : "outline"} onClick={() => setStoryForm(current => ({ ...current, mediaType: "video" }))}>فيديو</Button>
            <Button onClick={handleCreateStory} disabled={!storyForm.mediaUrl.trim() || createStoryMutation.isPending}>
              {createStoryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CirclePlus className="w-4 h-4" />}
              نشر ستوري
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(storiesQuery.data ?? []).map(story => (
          <Card key={story.id} className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-base">{story.creator}</CardTitle>
              <CardDescription>{story.title} · {story.time}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border bg-muted/40 p-4 min-h-36 flex items-center justify-center text-center">
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
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>ابدأ بث مباشر</CardTitle>
          <CardDescription>بدء وإنهاء البث تم ربطه بالـ API المباشر.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input value={liveTitle} onChange={(e) => setLiveTitle(e.target.value)} placeholder="عنوان البث" className="flex-1" />
          <Button onClick={handleStartLive} disabled={!liveTitle.trim() || startLiveMutation.isPending}>
            {startLiveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
            ابدأ الآن
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(liveQuery.data ?? []).map(stream => (
          <Card key={stream.id} className="border-0 shadow-md">
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
    <Card className="border-0 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle>الإشعارات</CardTitle>
            <CardDescription>قراءة الإشعارات وتحديث حالتها من الـ API.</CardDescription>
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
        {(notificationsQuery.data ?? []).map(item => (
          <div key={item.id} className="rounded-2xl border p-4 flex items-start justify-between gap-3">
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
      <Card className="border-0 shadow-md">
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(marketQuery.data ?? []).map(product => (
          <Card key={product.id} className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-base">{product.name}</CardTitle>
              <CardDescription>{product.store}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Badge>{product.price}</Badge>
              <p className="text-sm text-muted-foreground">{product.city}</p>
              <p className="text-sm text-muted-foreground">{product.posted}</p>
              <p className="text-sm leading-6">{product.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="grid gap-4 xl:grid-cols-[1.4fr,1fr]">
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>المجموعات</CardTitle>
          <CardDescription>الانضمام والمغادرة شغالين بالـ API.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(groupsQuery.data ?? []).map(group => (
            <div key={group.id} className="rounded-2xl border p-4 flex items-center justify-between gap-3">
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

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>الحساب</CardTitle>
          <CardDescription>بيانات الحساب الحالي من جلسة الـ API.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-2xl border p-4">
            <p className="font-semibold">{currentUser?.name}</p>
            <p className="text-sm text-muted-foreground mt-1">{currentUser?.email ?? currentUser?.phone_number ?? "بدون وسيلة تواصل"}</p>
          </div>
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold">يامن شات — Web API-first</h1>
            <p className="text-sm text-muted-foreground">مرحباً {currentUser?.name}، الجزء المتبقي من الواجهة بقى مربوط بالـ API.</p>
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
              جارٍ تنفيذ العملية ورفع التحديثات من وإلى الـ API...
            </CardContent>
          </Card>
        )}

        {activeTab === "feed" && renderFeed()}
        {activeTab === "chat" && renderChat()}
        {activeTab === "stories" && renderStories()}
        {activeTab === "live" && renderLive()}
        {activeTab === "notifications" && renderNotifications()}
        {activeTab === "market" && renderMarket()}
        {activeTab === "settings" && renderSettings()}
      </main>
    </div>
  );
}
