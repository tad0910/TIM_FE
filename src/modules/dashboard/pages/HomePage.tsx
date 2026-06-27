import Sidebar from "../components/Sidebar";
import PostBox from "../components/PostBox";
import InfiniteScrollPostList from "../components/InfiniteScrollPostList";
import RankingCard from "../components/RankingCard";
import NewsList from "../components/NewsList";
import { useState } from "react";
export default function HomePage() {
  const [refreshPosts, setRefreshPosts] = useState(0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3">
          <Sidebar />
        </div>

        <div className="lg:col-span-6 space-y-4">
          <PostBox onPostCreated={() => {
            setRefreshPosts(prev => prev + 1);
          }} />
          
          <InfiniteScrollPostList refreshTrigger={refreshPosts} />
          

        </div>

        <div className="lg:col-span-3">
          <aside className="space-y-4 sticky top-20">
            <RankingCard />
            <NewsList />
          </aside>
        </div>
      </div>
    </div>
  );
}