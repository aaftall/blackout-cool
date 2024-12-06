import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import blackoutLogo from "@/assets/logo-blackout 1.png";
import { toast } from 'sonner';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [redirectTo, setRedirectTo] = useState(() => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/login`;
  });
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);

  useEffect(() => {
    // Extract community ID from URL and add it to redirect URL
    if (location.pathname.startsWith('/login/join/')) {
      const communityId = location.pathname.split('/login/join/')[1].split('/')[0];
      console.log('[Debug] Found community ID in URL:', communityId);
      
      // Create redirect URL using the current origin
      const redirectUrl = new URL('/login', window.location.origin);
      redirectUrl.searchParams.set('joining', communityId);
      
      console.log('[Debug] Setting redirect URL:', redirectUrl.toString());
      
      // Update Auth component's redirectTo
      setRedirectTo(redirectUrl.toString());
    }
  }, [location.pathname]);

  useEffect(() => {
    console.log('[Debug] Login page loaded:', {
      pathname: location.pathname,
      hash: window.location.hash,
      search: window.location.search,
      params: new URLSearchParams(location.search)
    });

    const handleHashFragment = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        console.log('[Debug] Auth parameters:', {
          hashParams: Object.fromEntries(hashParams),
          queryParams: Object.fromEntries(queryParams),
        });

        if (hashParams.has('access_token') || queryParams.has('code')) {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error) throw error;
          if (session) {
            console.log('[Debug] Session retrieved:', {
              user: session.user?.id,
              expires: session.expires_at
            });
            
            // Get community ID from URL params
            const joiningCommunityId = queryParams.get('joining');
            console.log('[Debug] Joining community:', joiningCommunityId);
            
            handleAuthSuccess(session, joiningCommunityId);
          }
        }
      } catch (error) {
        console.error('[Debug] Hash handling error:', error);
        toast.error('Authentication failed');
      }
    };

    handleHashFragment();
  }, [location]);

  const handleAuthSuccess = async (session: any, communityId: string | null) => {
    console.log('[Debug] Starting auth success handler:', {
      communityId,
      user: session?.user?.id,
      timestamp: new Date().toISOString()
    });

    if (!session?.user?.id) {
      console.error('[Debug] No valid user ID in session');
      toast.error('Authentication error');
      navigate('/');
      return;
    }

    if (!communityId) {
      console.log('[Debug] No community ID to join');
      navigate('/');
      return;
    }

    try {
      const { data: newMember, error: insertError } = await supabase
        .from('community_members')
        .insert({
          community_id: communityId,
          user_id: session.user.id,
          user_role: 'member',
          joined_at: new Date().toISOString()
        })
        .select('id, community_id, user_id')
        .single();

      console.log('[Debug] Insert attempt result:', {
        success: !!newMember,
        error: insertError,
        data: newMember
      });

      if (insertError) {
        if (insertError.code === '23505') {
          console.log('[Debug] User already a member');
          toast.success('Already a member of this community');
          navigate(`/community/${communityId}/gallery`);
          return;
        }
        throw insertError;
      }

      toast.success('Successfully joined the community');
      navigate(`/community/${communityId}/gallery`);
    } catch (error: any) {
      console.error('[Debug] Join process failed:', error);
      toast.error('Failed to join community');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        <div className="flex flex-col items-center">
          <img 
            src={blackoutLogo} 
            alt="Blackout Logo" 
            className="w-24 h-24 mb-4 animate-spin-slow"
          />
          <h2 className="text-center text-3xl font-bold">
            Welcome to your
          </h2>
          <h2 className="text-center text-3xl font-bold">
            coolest <span className="text-mesh-gradient">Blackout</span>
          </h2>
        </div>
        <div className="space-y-3 text-lg">
          <button 
            onClick={() => setIsGuidelinesOpen(!isGuidelinesOpen)}
            className="w-full flex items-center justify-between font-semibold text-xl mb-4 hover:text-gray-300 transition-colors"
          >
            <span>How it works:</span>
            <svg 
              className={`w-6 h-6 transform transition-transform ${isGuidelinesOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <div className={`space-y-3 transition-all duration-300 ease-in-out ${isGuidelinesOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
            <div className="flex items-center space-x-3">
              <span className="bg-camera-button px-3 py-1 rounded-full text-sm">1</span>
              <p>Create your account</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="bg-camera-button px-3 py-1 rounded-full text-sm">2</span>
              <p>Create or join a party with your friends</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="bg-camera-button px-3 py-1 rounded-full text-sm">3</span>
              <p>Take pictures during the night</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="bg-camera-button px-3 py-1 rounded-full text-sm">4</span>
              <p>Discover them the next day</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="bg-camera-button px-3 py-1 rounded-full text-sm">5</span>
              <p>Save and share the best ones</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="bg-camera-button px-3 py-1 rounded-full text-sm">6</span>
              <p>Fully private - we don't use your photo, we don't access your camera roll</p>
            </div>
          </div>
        </div>
        <div className="mt-8 bg-camera-controls rounded-lg p-8">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#3B82F6',
                    brandAccent: '#2563EB',
                    inputBackground: 'rgba(255, 255, 255, 0.1)',
                    inputText: 'white',
                    inputPlaceholder: 'rgba(255, 255, 255, 0.5)',
                  },
                  borderWidths: {
                    buttonBorderWidth: '0px',
                    inputBorderWidth: '0px',
                  },
                  radii: {
                    borderRadiusButton: '8px',
                    buttonBorderRadius: '8px',
                    inputBorderRadius: '8px',
                  },
                },
              },
              className: {
                container: 'text-white',
                label: 'text-white',
                button: 'bg-black hover:bg-black/90 transition-colors',
                input: 'bg-camera-controls border-none text-white placeholder-white/50',
              },
            }}
            providers={['google']}
            redirectTo={redirectTo}
            onlyThirdPartyProviders
            queryParams={{
              redirect_to: redirectTo
            }}
          />
        </div>
      </div>
      <style>{`
        .text-mesh-gradient {
          background: linear-gradient(to right, #9333ea, #ec4899, #ef4444);
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          transition: all 0.3s;
        }
        .text-mesh-gradient:hover {
          background: linear-gradient(to right, #ef4444, #ec4899, #9333ea);
        }
      `}</style>
    </div>
  );
};

export default Login;