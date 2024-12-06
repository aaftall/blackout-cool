import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export const JoinRedirect = () => {
  const { communityId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (communityId) {
      console.log('[Debug] Storing community ID from redirect:', communityId);
      localStorage.setItem('pendingCommunityJoin', communityId);
      navigate('/login');
    }
  }, [communityId, navigate]);

  return null;
}; 