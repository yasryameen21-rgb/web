import { useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  Bell,
  Blocks,
  Camera,
  Check,
  ChevronLeft,
  CirclePlus,
  Filter,
  Gift,
  Heart,
  Home,
  ImagePlus,
  Loader2,
  LogOut,
  Menu,
  MessageCircle,
  Mic,
  MonitorPlay,
  Package,
  Phone,
  PlayCircle,
  Search,
  Send,
  Settings,
  Shield,
  ShoppingBag,
  Sparkles,
  Store,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  Video,
  VideoIcon,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type AppTab = "feed" | "chat" | "reels" | "live" | "notifications" | "market" | "settings";

type Post = {
  id: number;
  author: string;
  handle: string;
  text: string;
  time: string;
  likes: number;
  comments: number;
  shares: number;
  liked: boolean;
  following: boolean;
  blocked: boolean;
  category: string;
  mediaType?: "image" | "video";
  mediaUrl?: string;
  mediaName?: string;
};

type ChatThread = {
  id: number;
  name: string;
  lastMessage: string;
  time: string;
  online: boolean;
  unread: number;
  messages: { id: number; text: string; mine: boolean; time: string }[];
};

type FriendRequest = {
  id: number;
  name: string;
  mutual: number;
  city: string;
  status: "pending" | "accepted" | "declined";
};

type Suggestion = {
  id: number;
  name: string;
  bio: string;
  following: boolean;
};

type LiveHost = {
  id: number;
  name: string;
  title: string;
  viewers: string;
  filter: string;
  invited: boolean;
  joinRequested: boolean;
};

type GroupJoin = {
  id: number;
  name: string;
  members: string;
  requestSent: boolean;
};

type Product = {
  id: number;
  name: string;
  price: string;
  store: string;
  city: string;
  posted: string;
};

const navItems: { key: AppTab; label: string; icon: typeof Home }[] = [
  { key: "feed", label: "المنشورات", icon: Home },
  { key: "chat", label: "الدردشة", icon: MessageCircle },
  { key: "reels", label: "ريلز", icon: PlayCircle },
  { key: "live", label: "بث", icon: VideoIcon },
  { key: "notifications", label: "الإشعارات", icon: Bell },
  { key: "market", label: "السوق", icon: ShoppingBag },
  { key: "settings", label: "الإعدادات", icon: Settings },
];

const initialPosts: Post[] = [
  {
    id: 1,
    author: "ياسر عبدالله",
    handle: "@yasser.family",
    text: "أهلاً بكل الأصدقاء 👋 أضفت اليوم مساحة جديدة للمنشورات والريلز والبث المباشر. شاركوني أول انطباع لكم عن التصميم الجديد.",
    time: "منذ 12 دقيقة",
    likes: 128,
    comments: 24,
    shares: 13,
    liked: false,
    following: true,
    blocked: false,
    category: "تحديثات",
  },
  {
    id: 2,
    author: "هند محمود",
    handle: "@hind.creates",
    text: "جربت ميزة رفع الصور من الملفات والكاميرا في صفحة النشر، والخطوة الجاية إني أنشر فيديو قصير في الريلز ✨",
    time: "منذ 45 دقيقة",
    likes: 92,
    comments: 18,
    shares: 7,
    liked: true,
    following: false,
    blocked: false,
    category: "صور وفيديو",
  },
  {
    id: 3,
    author: "محمود سامي",
    handle: "@mahmoud.live",
    text: "هبدأ بث مباشر الليلة عن إنشاء الصفحات والمتاجر داخل التطبيق. لو حابب تنضم كضيف ابعت طلب انضمام من صفحة البث.",
    time: "منذ ساعة",
    likes: 210,
    comments: 44,
    shares: 29,
    liked: false,
    following: false,
    blocked: false,
    category: "بث مباشر",
  },
];

const initialChats: ChatThread[] = [
  {
    id: 1,
    name: "فريق التطوير",
    lastMessage: "تم تجهيز واجهة السوق والإشعارات.",
    time: "الآن",
    online: true,
    unread: 3,
    messages: [
      { id: 1, text: "صباح الخير، هل تم ربط زر ابدأ الآن؟", mine: false, time: "9:11" },
      { id: 2, text: "نعم، أصبح ينقلك مباشرة إلى الصفحة الرئيسية الجديدة.", mine: true, time: "9:13" },
      { id: 3, text: "ممتاز، نكمل تحسين صفحة البث المباشر.", mine: false, time: "9:15" },
    ],
  },
  {
    id: 2,
    name: "مجموعة العائلة",
    lastMessage: "مين هيجرب ميزة الريلز؟",
    time: "قبل 10 د",
    online: true,
    unread: 1,
    messages: [
      { id: 1, text: "مين هيجرب ميزة الريلز؟", mine: false, time: "8:50" },
      { id: 2, text: "أنا جهزت فيديو قصير بالفعل 😄", mine: true, time: "8:53" },
    ],
  },
  {
    id: 3,
    name: "سارة التصميم",
    lastMessage: "ألوان الواجهة ممتازة جداً",
    time: "أمس",
    online: false,
    unread: 0,
    messages: [
      { id: 1, text: "ألوان الواجهة ممتازة جداً", mine: false, time: "أمس" },
      { id: 2, text: "شكراً، سنضيف بعض التحسينات على صفحة الإعدادات.", mine: true, time: "أمس" },
    ],
  },
];

const initialRequests: FriendRequest[] = [
  { id: 1, name: "أحمد فوزي", mutual: 12, city: "القاهرة", status: "pending" },
  { id: 2, name: "منة السيد", mutual: 8, city: "الإسكندرية", status: "pending" },
  { id: 3, name: "خالد ربيع", mutual: 20, city: "المنصورة", status: "accepted" },
];

const initialSuggestions: Suggestion[] = [
  { id: 1, name: "نور أحمد", bio: "تصميم واجهات وتجربة مستخدم", following: false },
  { id: 2, name: "عبدالرحمن علي", bio: "صانع محتوى تقني وبث مباشر", following: false },
  { id: 3, name: "داليا سامح", bio: "متجر إلكتروني للأزياء والإكسسوارات", following: true },
];

const initialLiveHosts: LiveHost[] = [
  { id: 1, name: "رامي لايف", title: "جولة داخل المتجر الإلكتروني", viewers: "2.1K", filter: "سينمائي", invited: false, joinRequested: false },
  { id: 2, name: "نورا شورتس", title: "كيف تنشئ ريل احترافي؟", viewers: "980", filter: "وردية", invited: true, joinRequested: false },
  { id: 3, name: "أدمن المجتمع", title: "استقبال طلبات الانضمام للمجموعات", viewers: "1.4K", filter: "طبيعي", invited: false, joinRequested: true },
];

const initialGroups: GroupJoin[] = [
  { id: 1, name: "مجموعة المصممين", members: "12.4 ألف عضو", requestSent: false },
  { id: 2, name: "نادي التجارة الرقمية", members: "8.7 ألف عضو", requestSent: true },
  { id: 3, name: "مجتمع البث المباشر", members: "5.3 ألف عضو", requestSent: false },
];

const initialProducts: Product[] = [
  { id: 1, name: "سماعات لاسلكية", price: "750 ج.م", store: "متجر يامن تك", city: "القاهرة", posted: "منذ ساعة" },
  { id: 2, name: "طقم إضاءة بث مباشر", price: "1,250 ج.م", store: "ستور ستريم", city: "الجيزة", posted: "منذ 3 ساعات" },
  { id: 3, name: "حامل موبايل للتصوير", price: "320 ج.م", store: "فاست شوب", city: "طنطا", posted: "أمس" },
];

const notificationsSeed = [
  { id: 1, title: "تم قبول طلب صداقتك", description: "خالد ربيع أصبح ضمن أصدقائك.", type: "صداقة" },
  { id: 2, title: "دعوة جديدة للبث", description: "نورا شورتس دعتك للانضمام إلى بثها اليوم.", type: "بث" },
  { id: 3, title: "طلب انضمام للمجموعة", description: "تمت مراجعة طلبك في نادي التجارة الرقمية.", type: "مجموعات" },
  { id: 4, title: "عميل مهتم في السوق", description: "هناك تفاعل جديد على إعلان حامل الموبايل.", type: "السوق" },
];

const reelItems = [
  {
    id: 1,
    creator: "نادر فيديو",
    title: "3 حيل سريعة لزيادة تفاعل المنشورات",
    likes: "12 ألف",
    comments: 230,
    shares: 88,
  },
  {
    id: 2,
    creator: "سلمى ميديا",
    title: "تحويل منتج بسيط إلى إعلان جذاب خلال 20 ثانية",
    likes: "8.7 ألف",
    comments: 175,
    shares: 53,
  },
];

export default function SocialApp() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<AppTab>("feed");
  const [posts, setPosts] = useState(initialPosts);
  const [requests, setRequests] = useState(initialRequests);
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [liveHosts, setLiveHosts] = useState(initialLiveHosts);
  const [groups, setGroups] = useState(initialGroups);
  const [products, setProducts] = useState(initialProducts);
  const [searchValue, setSearchValue] = useState("");
  const [postText, setPostText] = useState("");
  const [commentText, setCommentText] = useState<{ [key: number]: string }>({});
  const [activeCommentId, setActiveCommentId] = useState<number | null>(null);
  const [marketForm, setMarketForm] = useState({ name: "", price: "", store: "", city: "" });
  const [chatThreads, setChatThreads] = useState(initialChats);
  const [selectedChatId, setSelectedChatId] = useState(initialChats[0].id);
  const [chatMessage, setChatMessage] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<{
    type: "image" | "video";
    url: string;
    name: string;
  } | null>(null);

  const selectedChat = useMemo(
    () => chatThreads.find((thread) => thread.id === selectedChatId) ?? chatThreads[0],
    [chatThreads, selectedChatId]
  );

  const unreadNotifications = notificationsSeed.length;
  const pendingRequests = requests.filter((request) => request.status === "pending").length;
  const visiblePosts = posts.filter((post) => !post.blocked);

  const toggleLike = (postId: number) => {
    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? {
              ...post,
              liked: !post.liked,
              likes: post.liked ? post.likes - 1 : post.likes + 1,
            }
          : post
      )
    );
  };

  const toggleFollowPostAuthor = (postId: number) => {
    setPosts((current) =>
      current.map((post) =>
        post.id === postId ? { ...post, following: !post.following } : post
      )
    );
  };

  const blockAuthor = (postId: number) => {
    setPosts((current) =>
      current.map((post) => (post.id === postId ? { ...post, blocked: true } : post))
    );
  };

  const submitComment = (postId: number) => {
    const text = commentText[postId];
    if (!text?.trim()) return;
    
    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? { ...post, comments: post.comments + 1 }
          : post
      )
    );
    setCommentText({ ...commentText, [postId]: "" });
    setActiveCommentId(null);
  };

  const handlePublishProduct = () => {
    if (!marketForm.name || !marketForm.price) return;
    
    const newProduct: Product = {
      id: Date.now(),
      name: marketForm.name,
      price: marketForm.price,
      store: marketForm.store || "متجري",
      city: marketForm.city || "غير محدد",
      posted: "الآن",
    };
    
    setProducts([newProduct, ...products]);
    setMarketForm({ name: "", price: "", store: "", city: "" });
  };

  const submitPost = async () => {
    if (!postText.trim() && !selectedMedia) return;
    setIsPublishing(true);
    await new Promise((resolve) => setTimeout(resolve, 600));

    setPosts((current) => [
      {
        id: Date.now(),
        author: "أنت",
        handle: "@you",
        text: postText || (selectedMedia?.type === "video" ? "تم نشر فيديو جديد" : "تم نشر صورة جديدة"),
        time: "الآن",
        likes: 0,
        comments: 0,
        shares: 0,
        liked: false,
        following: true,
        blocked: false,
        category: selectedMedia?.type === "video" ? "فيديو جديد" : selectedMedia?.type === "image" ? "صورة جديدة" : "منشور جديد",
        mediaType: selectedMedia?.type,
        mediaUrl: selectedMedia?.url,
        mediaName: selectedMedia?.name,
      },
      ...current,
    ]);

    toast.success(selectedMedia?.type === "video" ? "تم نشر الفيديو بنجاح" : selectedMedia?.type === "image" ? "تم نشر الصورة بنجاح" : "تم نشر المنشور بنجاح");
    setPostText("");
    clearSelectedMedia();
    setIsPublishing(false);
    setActiveTab("feed");
  };

  const sendChatMessage = () => {
    if (!chatMessage.trim()) return;

    setChatThreads((current) =>
      current.map((thread) =>
        thread.id === selectedChatId
          ? {
              ...thread,
              lastMessage: chatMessage,
              time: "الآن",
              messages: [
                ...thread.messages,
                {
                  id: Date.now(),
                  text: chatMessage,
                  mine: true,
                  time: "الآن",
                },
              ],
            }
          : thread
      )
    );
    setChatMessage("");
  };

  const updateRequestStatus = (requestId: number, status: FriendRequest["status"]) => {
    setRequests((current) =>
      current.map((request) =>
        request.id === requestId ? { ...request, status } : request
      )
    );
  };

  const toggleSuggestionFollow = (id: number) => {
    setSuggestions((current) =>
      current.map((item) =>
        item.id === id ? { ...item, following: !item.following } : item
      )
    );
  };

  const toggleLiveInvite = (id: number) => {
    setLiveHosts((current) =>
      current.map((item) =>
        item.id === id ? { ...item, invited: !item.invited } : item
      )
    );
  };

  const toggleJoinRequest = (id: number) => {
    setLiveHosts((current) =>
      current.map((item) =>
        item.id === id ? { ...item, joinRequested: !item.joinRequested } : item
      )
    );
  };

  const toggleGroupRequest = (id: number) => {
    setGroups((current) =>
      current.map((group) =>
        group.id === id ? { ...group, requestSent: !group.requestSent } : group
      )
    );
  };

  const addMarketItem = () => {
    setProducts((current) => [
      {
        id: Date.now(),
        name: "منتج جديد من صفحتك",
        price: "قابل للتفاوض",
        store: "متجرك الجديد",
        city: "أضف المدينة",
        posted: "الآن",
      },
      ...current,
    ]);
  };

  const clearSelectedMedia = () => {
    setSelectedMedia(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleMediaSelection = (
    event: React.ChangeEvent<HTMLInputElement>,
    forcedType?: "image" | "video"
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const inferredType = forcedType || (file.type.startsWith("video/") ? "video" : "image");
    const fileUrl = URL.createObjectURL(file);

    setSelectedMedia({
      type: inferredType,
      url: fileUrl,
      name: file.name,
    });

    toast.success(inferredType === "video" ? "تم اختيار الفيديو بنجاح" : "تم اختيار الصورة بنجاح");
  };

  const openImagePicker = () => imageInputRef.current?.click();
  const openVideoPicker = () => videoInputRef.current?.click();
  const openFilePicker = () => fileInputRef.current?.click();

  const handleLogout = () => {
    localStorage.removeItem("yamenChatSignupProfile");
    toast.success("تم تسجيل الخروج بنجاح");
    setLocation("/");
  };

  const renderFeed = () => (
    <div className="space-y-4">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleMediaSelection(e, "image")}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => handleMediaSelection(e, "video")}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => handleMediaSelection(e)}
      />
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">أنشئ منشور جديد</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                اكتب منشورًا، ارفع صورة أو فيديو، أو ابدأ بثًا مباشرًا.
              </p>
            </div>
            <Badge className="bg-primary/10 text-primary hover:bg-primary/10">واجهة اجتماعية كاملة</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            placeholder="بماذا تفكر الآن؟"
            className="min-h-28 bg-background"
          />
          {selectedMedia && (
            <div className="rounded-2xl border border-blue-200 bg-white p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">معاينة قبل النشر</p>
                  <p className="text-sm text-muted-foreground">{selectedMedia.name}</p>
                </div>
                <Button type="button" variant="outline" className="border-red-200 text-red-700" onClick={clearSelectedMedia}>
                  <X className="w-4 h-4" />
                  إزالة
                </Button>
              </div>
              {selectedMedia.type === "image" ? (
                <img src={selectedMedia.url} alt={selectedMedia.name} className="w-full max-h-80 object-cover rounded-xl border" />
              ) : (
                <video src={selectedMedia.url} controls className="w-full max-h-80 rounded-xl border bg-black" />
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Button type="button" variant="outline" className="justify-start border-blue-200 text-blue-700 hover:bg-blue-50" onClick={openImagePicker}>
              <Camera className="w-4 h-4" />
              من الكاميرا
            </Button>
            <Button type="button" variant="outline" className="justify-start border-cyan-200 text-cyan-700 hover:bg-cyan-50" onClick={openFilePicker}>
              <Upload className="w-4 h-4" />
              من الملفات
            </Button>
            <Button type="button" variant="outline" className="justify-start border-violet-200 text-violet-700 hover:bg-violet-50" onClick={openVideoPicker}>
              <Video className="w-4 h-4" />
              فيديو قصير
            </Button>
            <Button type="button" variant="outline" className="justify-start border-emerald-200 text-emerald-700 hover:bg-emerald-50">
              <Mic className="w-4 h-4" />
              بث صوتي
            </Button>
          </div>
        </CardContent>
        <CardFooter className="justify-between gap-3 border-t pt-6 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary">خصوصية مرنة</Badge>
            <Badge variant="secondary">تعليقات فورية</Badge>
            <Badge variant="secondary">مشاركة إلى الريلز</Badge>
          </div>
          <Button onClick={submitPost} disabled={(!postText.trim() && !selectedMedia) || isPublishing} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CirclePlus className="w-4 h-4" />}
            نشر الآن
          </Button>
        </CardFooter>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.5fr,1fr]">
        <div className="space-y-4">
          {visiblePosts.map((post) => (
            <Card key={post.id} className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-12">
                      <AvatarFallback className="bg-primary/15 text-primary font-bold">
                        {post.author.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{post.author}</h3>
                        <Badge variant="outline">{post.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {post.handle} · {post.time}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={post.following ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => toggleFollowPostAuthor(post.id)}
                    >
                      <UserPlus className="w-4 h-4" />
                      {post.following ? "متابَع" : "متابعة"}
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => blockAuthor(post.id)}>
                      <Blocks className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="leading-7">{post.text}</p>
                <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-secondary to-accent/20 min-h-52 flex items-center justify-center text-center p-6 overflow-hidden">
                  {post.mediaUrl ? (
                    post.mediaType === "video" ? (
                      <video src={post.mediaUrl} controls className="w-full max-h-96 rounded-xl bg-black" />
                    ) : (
                      <img src={post.mediaUrl} alt={post.mediaName || post.text} className="w-full max-h-96 object-cover rounded-xl" />
                    )
                  ) : (
                    <div>
                      <MonitorPlay className="w-10 h-10 mx-auto text-primary mb-3" />
                      <p className="font-medium">منطقة معاينة للصور والفيديو داخل المنشور</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        جاهزة لإضافة وسائط من الكاميرا أو ملفات الهاتف.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="border-t pt-5 justify-between gap-2 flex-wrap">
                <div className="flex gap-2 flex-wrap">
                  <Button type="button" variant={post.liked ? "default" : "ghost"} size="sm" onClick={() => toggleLike(post.id)}>
                    <Heart className={`w-4 h-4 ${post.liked ? "fill-current" : ""}`} />
                    {post.likes}
                  </Button>
                  <div className="relative">
                    <Button 
                      type="button" 
                      variant={activeCommentId === post.id ? "secondary" : "ghost"} 
                      size="sm"
                      onClick={() => setActiveCommentId(activeCommentId === post.id ? null : post.id)}
                    >
                      <MessageCircle className="w-4 h-4" />
                      {post.comments}
                    </Button>
                    {activeCommentId === post.id && (
                      <div className="absolute bottom-full mb-2 right-0 w-64 p-2 bg-card border rounded-lg shadow-xl z-50 flex gap-2">
                        <Input 
                          size="sm" 
                          placeholder="اكتب تعليقاً..." 
                          value={commentText[post.id] || ""}
                          onChange={(e) => setCommentText({...commentText, [post.id]: e.target.value})}
                          onKeyDown={(e) => e.key === 'Enter' && submitComment(post.id)}
                        />
                        <Button size="sm" onClick={() => submitComment(post.id)}>
                          <Send className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <Button type="button" variant="ghost" size="sm">
                    <Send className="w-4 h-4" />
                    {post.shares}
                  </Button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button type="button" variant="outline" size="sm" className="border-amber-200 text-amber-700 hover:bg-amber-50" onClick={openImagePicker}>
                    <ImagePlus className="w-4 h-4" />
                    أضف صورة
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="border-violet-200 text-violet-700 hover:bg-violet-50" onClick={openVideoPicker}>
                    <Sparkles className="w-4 h-4" />
                    أضف فيديو
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>طلبات الصداقة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="rounded-xl border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{request.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {request.city} · {request.mutual} أصدقاء مشتركون
                      </p>
                    </div>
                    <Badge variant={request.status === "accepted" ? "default" : request.status === "declined" ? "destructive" : "secondary"}>
                      {request.status === "pending"
                        ? "قيد الانتظار"
                        : request.status === "accepted"
                          ? "تم القبول"
                          : "مرفوض"}
                    </Badge>
                  </div>
                  {request.status === "pending" && (
                    <div className="flex gap-2">
                      <Button type="button" className="flex-1" onClick={() => updateRequestStatus(request.id, "accepted")}>
                        <Check className="w-4 h-4" />
                        قبول
                      </Button>
                      <Button type="button" variant="outline" className="flex-1" onClick={() => updateRequestStatus(request.id, "declined")}>
                        <X className="w-4 h-4" />
                        رفض
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>اقتراحات الصداقة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {suggestions.map((item) => (
                <div key={item.id} className="rounded-xl border p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.bio}</p>
                  </div>
                  <Button type="button" variant={item.following ? "secondary" : "outline"} onClick={() => toggleSuggestionFollow(item.id)}>
                    <UserCheck className="w-4 h-4" />
                    {item.following ? "تتابعه" : "متابعة"}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderChat = () => (
    <div className="grid gap-4 lg:grid-cols-[340px,1fr]">
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>المحادثات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {chatThreads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => setSelectedChatId(thread.id)}
              className={`w-full rounded-2xl border p-4 text-right transition ${
                selectedChatId === thread.id ? "border-primary bg-primary/10" : "hover:bg-muted/60"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{thread.name}</span>
                    {thread.online && <span className="size-2 rounded-full bg-green-500" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{thread.lastMessage}</p>
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">{thread.time}</p>
                  {thread.unread > 0 && <Badge className="mt-2">{thread.unread}</Badge>}
                </div>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md min-h-[70vh]">
        <CardHeader className="border-b pb-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>{selectedChat.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                دردشة فورية مع إرسال صور وفيديوهات وملفات.
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="icon">
                <Phone className="w-4 h-4" />
              </Button>
              <Button type="button" variant="outline" size="icon">
                <Video className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 py-6 space-y-3">
          {selectedChat.messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.mine
                  ? "mr-auto bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              <p>{message.text}</p>
              <p className={`text-xs mt-2 ${message.mine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {message.time}
              </p>
            </div>
          ))}
        </CardContent>
        <CardFooter className="border-t pt-5 gap-3 flex-wrap">
          <Button type="button" variant="outline" size="icon">
            <Camera className="w-4 h-4" />
          </Button>
          <Button type="button" variant="outline" size="icon">
            <Upload className="w-4 h-4" />
          </Button>
          <Input
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="اكتب رسالتك..."
            className="flex-1 h-11"
          />
          <Button type="button" onClick={sendChatMessage} disabled={!chatMessage.trim()}>
            <Send className="w-4 h-4" />
            إرسال
          </Button>
        </CardFooter>
      </Card>
    </div>
  );

  const renderReels = () => (
    <div className="space-y-4">
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>ريلز الفيديوهات القصيرة</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                انشر، أعجب، علّق، وشارك المحتوى القصير بسرعة.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button type="button" variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50" onClick={openVideoPicker}>
                <Camera className="w-4 h-4" />
                تصوير ريل
              </Button>
              <Button type="button" className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white" onClick={openVideoPicker}>
                <CirclePlus className="w-4 h-4" />
                نشر ريل
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {reelItems.map((reel) => (
          <Card key={reel.id} className="border-0 shadow-md overflow-hidden">
            <div className="bg-gradient-to-b from-zinc-800 via-zinc-900 to-black min-h-[28rem] p-6 text-white flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <Badge className="bg-white/15 text-white hover:bg-white/15">ريلز</Badge>
                <Button type="button" variant="secondary" size="sm">
                  <Sparkles className="w-4 h-4" />
                  فلتر
                </Button>
              </div>
              <div>
                <p className="text-lg font-semibold">{reel.title}</p>
                <p className="text-white/70 mt-2">بواسطة {reel.creator}</p>
              </div>
            </div>
            <CardFooter className="justify-between gap-2 flex-wrap border-t pt-5">
              <div className="flex gap-2 flex-wrap">
                <Button type="button" variant="ghost" size="sm">
                  <Heart className="w-4 h-4" />
                  {reel.likes}
                </Button>
                <Button type="button" variant="ghost" size="sm">
                  <MessageCircle className="w-4 h-4" />
                  {reel.comments}
                </Button>
                <Button type="button" variant="ghost" size="sm">
                  <Send className="w-4 h-4" />
                  {reel.shares}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="border-fuchsia-200 text-fuchsia-700 hover:bg-fuchsia-50" onClick={openVideoPicker}>
                  <Upload className="w-4 h-4" />
                  نشر
                </Button>
                <Button type="button" variant="outline" size="sm" className="border-amber-200 text-amber-700 hover:bg-amber-50" onClick={openImagePicker}>
                  <ImagePlus className="w-4 h-4" />
                  غلاف
                </Button>
              </div>
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
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>البث المباشر</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                شاهد من يبث الآن، استقبل الدعوات، واطلب الانضمام مع فلاتر جاهزة.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button type="button" variant="outline">
                <Filter className="w-4 h-4" />
                فلاتر البث
              </Button>
              <Button type="button">
                <Video className="w-4 h-4" />
                ابدأ بث مباشر
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {liveHosts.map((host) => (
          <Card key={host.id} className="border-0 shadow-md">
            <CardContent className="pt-6 space-y-4">
              <div className="rounded-2xl min-h-52 bg-gradient-to-br from-rose-500/20 via-orange-400/10 to-primary/20 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <Badge className="bg-red-600 text-white hover:bg-red-600">مباشر الآن</Badge>
                  <Badge variant="secondary">فلتر: {host.filter}</Badge>
                </div>
                <div>
                  <p className="text-lg font-semibold">{host.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{host.name}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">المشاهدون: {host.viewers}</span>
                <Button type="button" variant="ghost" size="sm">
                  <Gift className="w-4 h-4" />
                  إرسال هدية
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={host.invited ? "secondary" : "outline"} onClick={() => toggleLiveInvite(host.id)}>
                  <Users className="w-4 h-4" />
                  {host.invited ? "تمت دعوتك" : "دعوة للبث"}
                </Button>
                <Button type="button" onClick={() => toggleJoinRequest(host.id)} variant={host.joinRequested ? "secondary" : "default"}>
                  <ChevronLeft className="w-4 h-4" />
                  {host.joinRequested ? "الطلب مُرسل" : "طلب انضمام"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-4">
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>الإشعارات</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">كل التنبيهات الخاصة بالصداقة، السوق، البث والمجموعات.</p>
            </div>
            <Badge>{unreadNotifications} جديد</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {notificationsSeed.map((item) => (
            <div key={item.id} className="rounded-2xl border p-4 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold">{item.title}</p>
                  <Badge variant="secondary">{item.type}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
              </div>
              <Button type="button" variant="ghost" size="sm">عرض</Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  const renderMarket = () => (
    <div className="space-y-4">
      <Card className="border-0 shadow-md bg-gradient-to-br from-primary/10 via-card to-accent/10">
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>متجر التسوق الإلكتروني</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                أنشئ صفحة متجر، أضف منتجات، وانشر عروضك داخل السوق مباشرة.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Dialog>
                <DialogTrigger asChild>
                  <Button type="button">
                    <Package className="w-4 h-4" />
                    نشر منتج في السوق
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>نشر منتج جديد</DialogTitle>
                    <DialogDescription>أدخل تفاصيل المنتج ليظهر في السوق الإلكتروني.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">اسم المنتج</label>
                      <Input 
                        placeholder="مثال: سماعات لاسلكية" 
                        value={marketForm.name}
                        onChange={(e) => setMarketForm({...marketForm, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">السعر</label>
                      <Input 
                        placeholder="مثال: 500 ج.م" 
                        value={marketForm.price}
                        onChange={(e) => setMarketForm({...marketForm, price: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">اسم المتجر</label>
                        <Input 
                          placeholder="متجري" 
                          value={marketForm.store}
                          onChange={(e) => setMarketForm({...marketForm, store: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">المدينة</label>
                        <Input 
                          placeholder="القاهرة" 
                          value={marketForm.city}
                          onChange={(e) => setMarketForm({...marketForm, city: e.target.value})}
                        />
                      </div>
                    </div>
                    <Button className="w-full" onClick={handlePublishProduct}>نشر الآن</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button type="button" variant="outline">
                <Store className="w-4 h-4" />
                إدارة متجري
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <Card key={product.id} className="border-0 shadow-md overflow-hidden">
            <div className="min-h-44 bg-gradient-to-br from-secondary via-primary/10 to-accent/20 flex items-center justify-center">
              <ShoppingBag className="w-12 h-12 text-primary" />
            </div>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">{product.name}</h3>
                <Badge>{product.price}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{product.store}</p>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{product.city}</span>
                <span>{product.posted}</span>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-5 justify-between gap-2">
              <Button type="button" variant="outline" size="sm">
                <Send className="w-4 h-4" />
                مشاركة
              </Button>
              <Button type="button" size="sm">
                <CirclePlus className="w-4 h-4" />
                تواصل مع البائع
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>إعدادات الحساب والخصوصية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">إدارة الحظر</p>
                <p className="text-sm text-muted-foreground">حظر الحسابات المزعجة والتحكم في ظهورك.</p>
              </div>
              <Button type="button" variant="outline">
                <Shield className="w-4 h-4" />
                فتح القائمة
              </Button>
            </div>
            <div className="rounded-2xl border p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">طلبات المتابعة والصداقة</p>
                <p className="text-sm text-muted-foreground">راجع الطلبات والاقتراحات من مكان واحد.</p>
              </div>
              <Badge>{pendingRequests} طلبات جديدة</Badge>
            </div>
            <div className="rounded-2xl border p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">خيارات الرفع الافتراضية</p>
                <p className="text-sm text-muted-foreground">الاختيار بين الكاميرا أو ملفات الهاتف مباشرة.</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary">كاميرا</Badge>
                <Badge variant="secondary">ملفات</Badge>
              </div>
            </div>
            <div className="rounded-2xl border p-4 flex items-center justify-between gap-3 bg-red-50/70">
              <div>
                <p className="font-semibold">تسجيل الخروج</p>
                <p className="text-sm text-muted-foreground">إنهاء الجلسة الحالية والعودة إلى شاشة البداية.</p>
              </div>
              <Button type="button" variant="outline" className="border-red-200 text-red-700 hover:bg-red-100" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
                تسجيل الخروج
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>المجموعات وطلبات الانضمام</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {groups.map((group) => (
              <div key={group.id} className="rounded-2xl border p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{group.name}</p>
                  <p className="text-sm text-muted-foreground">{group.members}</p>
                </div>
                <Button type="button" variant={group.requestSent ? "secondary" : "outline"} onClick={() => toggleGroupRequest(group.id)}>
                  <Users className="w-4 h-4" />
                  {group.requestSent ? "تم إرسال الطلب" : "طلب انضمام"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderActivePage = () => {
    switch (activeTab) {
      case "chat":
        return renderChat();
      case "reels":
        return renderReels();
      case "live":
        return renderLive();
      case "notifications":
        return renderNotifications();
      case "market":
        return renderMarket();
      case "settings":
        return renderSettings();
      case "feed":
      default:
        return renderFeed();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-100 pb-28">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl">
        <div className="container py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold gradient-text">يامن شات</h1>
            <p className="text-sm text-muted-foreground">شبكة اجتماعية متكاملة للمنشورات والدردشة والبث والسوق</p>
          </div>

          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="icon">
                  <Search className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>البحث داخل التطبيق</DialogTitle>
                  <DialogDescription>
                    ابحث عن منشورات، أصدقاء، منتجات، مجموعات أو بث مباشر.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder="ابحث عن أي شيء..."
                    className="h-11"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Card className="border shadow-none">
                      <CardContent className="pt-6 space-y-2">
                        <p className="font-semibold">نتائج سريعة</p>
                        <p className="text-sm text-muted-foreground">منشورات تقنية، مجموعات التصميم، وسوق الأدوات.</p>
                      </CardContent>
                    </Card>
                    <Card className="border shadow-none">
                      <CardContent className="pt-6 space-y-2">
                        <p className="font-semibold">الأكثر بحثاً</p>
                        <p className="text-sm text-muted-foreground">ريلز، بث مباشر، طلبات الصداقة، ونشر منتج.</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Sheet>
              <SheetTrigger asChild>
                <Button type="button" variant="outline" size="icon">
                  <Menu className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>اختصارات التطبيق</SheetTitle>
                  <SheetDescription>وصول سريع إلى أهم الخدمات الاجتماعية داخل الواجهة.</SheetDescription>
                </SheetHeader>
                <div className="px-4 pb-6 grid gap-3">
                  {[
                    "إنشاء منشور جديد",
                    "رفع من الكاميرا",
                    "رفع من ملفات الهاتف",
                    "إدارة طلبات الصداقة",
                    "متابعة الحسابات",
                    "إرسال طلب انضمام لمجموعة",
                    "استقبال دعوات البث المباشر",
                  ].map((item) => (
                    <div key={item} className="rounded-2xl border p-4 text-sm text-muted-foreground bg-card">
                      {item}
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={() => setLocation("/welcome")}>
                    العودة لصفحة الترحيب
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="container relative z-10 py-6 space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">طلبات الصداقة</p>
              <p className="text-2xl font-bold mt-1">{pendingRequests}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">الإشعارات الجديدة</p>
              <p className="text-2xl font-bold mt-1">{unreadNotifications}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">البثوث النشطة الآن</p>
              <p className="text-2xl font-bold mt-1">{liveHosts.length}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">منتجات السوق</p>
              <p className="text-2xl font-bold mt-1">{products.length}</p>
            </CardContent>
          </Card>
        </div>

        {renderActivePage()}
      </main>

      <div className="fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur-xl">
        <div className="container py-3 overflow-x-auto">
          <div className="flex items-center justify-between gap-2 min-w-max">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.key;
              return (
                <Button
                  key={item.key}
                  type="button"
                  variant={active ? "default" : "ghost"}
                  className="flex-col h-auto py-2 px-3 min-w-20"
                  onClick={() => setActiveTab(item.key)}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{item.label}</span>
                  {item.key === "notifications" && unreadNotifications > 0 ? (
                    <Badge className="mt-1">{unreadNotifications}</Badge>
                  ) : null}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
