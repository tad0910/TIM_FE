import '../../fontawesome';
import type { Post } from '../../types/post';
import ModernPhotoGrid from '../ModernPhotoGrid';
import LinkPreview from '../LinkPreview';
import { getFirstUrl } from '../../utils/linkUtils';

interface PostContentProps {
  post: Post;
  className?: string;
}

export default function PostContent({ post, className = '' }: PostContentProps) {

  const firstUrl = getFirstUrl(post.content);
  const hasLink = firstUrl && !post.image && !post.images && !post.video && !post.videos;

  return (
    <div className={`${className}`}>
      <div className="text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
        {hasLink ? (
          post.content.replace(firstUrl!, '').trim()
        ) : (
          post.content
        )}
      </div>

      {hasLink && (
        <div className="mt-3">
          <LinkPreview url={firstUrl!} />
        </div>
      )}

      {(post.image || post.images) && (
        <div className="mt-4 bg-gray-100 p-1 rounded-lg">
          <ModernPhotoGrid
            images={post.images || [post.image!]}
            className="max-h-[500px]"
          />
        </div>
      )}

      {(post.video || post.videos) && (
        <div className="mt-4 bg-gray-100 p-1 rounded-lg">
          {(post.videos || [post.video!]).map((videoUrl, index) => (
            <video
              key={index}
              src={videoUrl}
              controls
              className="w-full rounded-lg max-h-[500px]"
              preload="metadata"
            >
              Trình duyệt của bạn không hỗ trợ video.
            </video>
          ))}
        </div>
      )}
    </div>
  );
}

