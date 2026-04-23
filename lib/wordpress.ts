import fs from 'fs';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';

function calculateReadTime(text: string) {
  if (!text) return "1 phút";
  const words = text.replace(/<[^>]*>?/gm, '').split(/\s+/).length;
  const time = Math.ceil(words / 200);
  return `${time} phút`;
}

export async function getWordpressPosts() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'wordpress-export.xml');
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    });
    
    const jsonObj = parser.parse(fileContent);
    const items = jsonObj.rss.channel.item;
    const itemsArray = Array.isArray(items) ? items : [items];

    const publishedPosts = itemsArray.filter(
      (item: any) => item['wp:post_type'] === 'post' && item['wp:status'] === 'publish'
    );

    return publishedPosts.map((post: any) => {
      let categoryName = 'Tin tức';
      if (post.category) {
        if (Array.isArray(post.category)) {
          categoryName = post.category[0]['#text'] || post.category[0];
        } else if (typeof post.category === 'object') {
          categoryName = post.category['#text'];
        } else {
          categoryName = post.category;
        }
      }

      let rawContent = post['content:encoded'] || '';
      
      // Dọn dẹp các link "Xem thêm chủ đề khác" / "Bài viết liên quan" được nhúng trong bài WP cũ
      rawContent = rawContent.replace(
        /<p[^>]*>(?:(?!<\/p>)[\s\S])*?(?:xem\s+t?thêm\s+chủ\s+đề|bài\s+viết\s+liên\s+quan)(?:(?!<\/p>)[\s\S])*?<\/p>/gi,
        ''
      );

      let desc = post['excerpt:encoded'] || '';
      if (!desc && rawContent) {
        desc = rawContent.replace(/<[^>]+>/g, '').substring(0, 150) + '...';
      }

      const pubDate = new Date(post.pubDate);
      const formattedDate = pubDate.toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });

      return {
        id: (post['wp:post_id'] || post.link).toString(), // Đảm bảo ID là chuỗi để so sánh URL
        title: post.title,
        category: categoryName,
        date: formattedDate,
        rawDate: pubDate.getTime(),
        readTime: calculateReadTime(rawContent),
        author: post['dc:creator'] || "Admin",
        desc: desc,
        content: rawContent, // BỔ SUNG: Lấy toàn bộ nội dung HTML
        link: post.link
      };
    });
  } catch (error) {
    console.error("Lỗi đọc file XML:", error);
    return [];
  }
}

export async function getPostById(id: string) {
  const posts = await getWordpressPosts();
  
  // Ép cả 2 về String để so sánh an toàn tuyệt đối
  const foundPost = posts.find((post: any) => String(post.id) === String(id));
  
  // Dòng này giúp bạn in ra Terminal xem lỗi ở đâu nếu vẫn bị 404
  if (!foundPost) {
    console.log("🚨 [DEBUG] Đang tìm ID từ URL:", id);
    console.log("🚨 [DEBUG] Các ID đang có trong XML:", posts.map((p: any) => p.id).join(", "));
  }
  
  return foundPost;
}