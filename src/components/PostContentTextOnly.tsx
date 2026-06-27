import '../fontawesome';
import type { Post } from '../types/post';
import LinkPreview from './LinkPreview';
import { getFirstUrl } from '../utils/linkUtils';

interface PostContentTextOnlyProps {
  post: Post;
  className?: string;
}

export default function PostContentTextOnly({ post, className = '' }: PostContentTextOnlyProps) {
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

    </div>
  );
}
