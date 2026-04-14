import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Heart, MessageCircle } from "lucide-react";

export default function Home() {
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
    await fetch("https://your-app-onrender-com/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });
    setContent("");
    window.location.reload(); 
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* شريط علوي أنيق */}
      <div className="bg-[#5c56d6] p-4 text-white text-center font-bold text-xl shadow-md mb-6">
        يامن شات - المنشورات
      </div>

      <div className="max-w-md mx-auto px-4 space-y-6">
        {/* صندوق كتابة منشور جديد بنفس روح التصميم السابق */}
        <Card className="p-4 shadow-sm border-none">
          <Textarea 
            placeholder="بماذا تفكر؟" 
            className="border-none focus:ring-0 text-lg"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex justify-end mt-2">
            <Button onClick={handlePost} className="bg-[#5c56d6] rounded-full px-6">
              <Send className="w-4 h-4 ml-2" /> نشر
            </Button>
          </div>
        </Card>

        {/* عرض المنشورات الحية */}
        {posts.map((post: any) => (
          <Card key={post.id} className="p-4 border-none shadow-sm bg-white rounded-2xl">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-[#5c56d6] font-bold">
                {post.username[0].toUpperCase()}
              </div>
              <div className="mr-3">
                <p className="font-bold text-gray-800">{post.username}</p>
                <p className="text-xs text-gray-400">الآن</p>
              </div>
            </div>
            <p className="text-gray-700 leading-relaxed">{post.content}</p>
            <div className="flex gap-4 mt-4 pt-3 border-t border-gray-50 text-gray-500">
              <button className="flex items-center gap-1 hover:text-[#5c56d6]"><Heart size={18}/> إعجاب</button>
              <button className="flex items-center gap-1 hover:text-[#5c56d6]"><MessageCircle size={18}/> تعليق</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
