import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Heart, MessageCircle } from "lucide-react";

export default function page() {
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState("");

  // جلب المنشورات من ريندر فور فتح الصفحة
  useEffect(() => {
    fetch("https://your-app-onrender-com/api/posts") 
      .then(res => res.json())
      .then(data => setPosts(data));
  }, []);

    const handlePost = async () => {
    if (!content.trim()) return;

    try {
      // إرسال المنشور الجديد إلى بايثون في ريندر
      const response = await fetch("https://web-50ne.onrender.com/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content })
      });

      if (response.ok) {
        setContent(""); // تفريغ الخانة بعد النشر
        // إعادة جلب المنشورات لتظهر الجديدة فوراً
        const res = await fetch("https://web-50ne.onrender.com/api/posts");
        const data = await res.json();
        setPosts(data);
      }
    } catch (error) {
      console.error("خطأ في النشر:", error);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold text-[#5c56d6] text-center">ساحة يامن شات</h1>
     
      {/* صندوق كتابة المنشور */}
      <Card className="p-4 shadow-sm border-none">
        <Textarea
          placeholder="بماذا تفكر؟"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="bg-slate-50 border-none"
        />
        <Button onClick={handlePost} className="w-full mt-3 bg-[#5c56d6]">
          <Send className="ml-2 w-4 h-4" /> نشر للجميع
        </Button>
      </Card>

      {/* عرض المنشورات الحية */}
      <div className="space-y-4">
        {posts.map((post: any) => (
          <Card key={post.id} className="p-4 border-none shadow-sm">
            <div className="font-bold text-sm text-[#5c56d6] mb-1">{post.username}</div>
            <p className="text-gray-700">{post.content}</p>
            <div className="flex gap-4 mt-3 text-gray-300">
              <Heart size={18} /> <MessageCircle size={18} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
