/**
 * Instagram Post Viewer Module for GradeMaster OS
 */

// Elements
const instaContent = document.getElementById('insta-content');
const instaLoader = document.getElementById('insta-loader');
const instaSearch = document.getElementById('instaSearch');

/**
 * Initialize Instagram App
 */
function initInstaApp() {
    if (instaContent) {
        instaContent.innerHTML = `
            <div class="col-span-full py-20 text-center text-slate-400">
                <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                </div>
                <p class="font-bold text-slate-600">Masukkan Username Instagram</p>
                <p class="text-xs mt-2">Gunakan kotak pencarian di atas untuk memulai.</p>
            </div>
        `;
    }
}

/**
 * Fetch Instagram Posts
 */
async function fetchInstaPosts() {
    const username = instaSearch.value.trim();
    if (!username) return;

    instaLoader.classList.remove('hidden');
    instaContent.innerHTML = '';

    try {
        const response = await fetch('/api/instagram', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username: username })
        });
        
        const result = await response.json();
        
        if (result.success && result.data && result.data.data && result.data.data.user) {
            renderInstaGallery(result.data.data.user);
        } else {
            throw new Error(result.message || 'Gagal mengambil data. Pastikan username benar dan publik.');
        }
    } catch (error) {
        console.error('Error fetching Instagram posts:', error);
        instaContent.innerHTML = `
            <div class="col-span-full py-20 text-center">
                <div class="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
                </div>
                <p class="font-black text-slate-800 mb-2">Terjadi Kesalahan</p>
                <p class="text-xs text-slate-400 mb-6">${error.message}</p>
                <button onclick="fetchInstaPosts()" class="px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold shadow-xl shadow-slate-900/20 active:scale-95 transition-all">Coba Lagi</button>
            </div>
        `;
    } finally {
        instaLoader.classList.add('hidden');
    }
}

/**
 * Render Instagram Gallery
 */
function renderInstaGallery(user) {
    const edge = user.edge_owner_to_timeline_media;
    if (!edge || !edge.edges || edge.edges.length === 0) {
        instaContent.innerHTML = `
            <div class="col-span-full py-20 text-center text-slate-400">
                <p class="font-bold">Tidak ada postingan ditemukan.</p>
            </div>
        `;
        return;
    }

    const posts = edge.edges;
    
    // User Profile Header inside Content
    const profileHtml = `
        <div class="col-span-full mb-10 p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 flex flex-col sm:flex-row items-center gap-8 animate-in">
            <div class="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-yellow-400 via-rose-500 to-purple-600">
                <img src="${user.profile_pic_url}" alt="${user.username}" class="w-full h-full rounded-full object-cover border-4 border-white">
            </div>
            <div class="text-center sm:text-left">
                <h3 class="text-2xl font-black text-slate-800 mb-1">@${user.username}</h3>
                <p class="text-sm font-medium text-slate-500 mb-4">${user.full_name}</p>
                <div class="flex items-center justify-center sm:justify-start gap-6">
                    <div class="text-center">
                        <p class="text-sm font-black text-slate-800">${user.edge_followed_by.count.toLocaleString()}</p>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Followers</p>
                    </div>
                    <div class="text-center">
                        <p class="text-sm font-black text-slate-800">${user.edge_follow.count.toLocaleString()}</p>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Following</p>
                    </div>
                    <div class="text-center">
                        <p class="text-sm font-black text-slate-800">${edge.count.toLocaleString()}</p>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Posts</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    instaContent.innerHTML = profileHtml + `
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            ${posts.map(post => {
                const node = post.node;
                const imageUrl = node.display_url;
                const likes = node.edge_liked_by ? node.edge_liked_by.count : 0;
                const comments = node.edge_media_to_comment ? node.edge_media_to_comment.count : 0;
                
                return `
                    <div class="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 shadow-md hover:shadow-xl transition-all duration-500">
                        <img src="${imageUrl}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy">
                        
                        <!-- Overlay on Hover -->
                        <div class="absolute inset-0 bg-black/40 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 backdrop-blur-[2px] transition-all duration-300">
                            <div class="flex items-center gap-1.5 text-white font-bold text-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" class="text-rose-500"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                                ${likes}
                            </div>
                            <div class="flex items-center gap-1.5 text-white font-bold text-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" class="text-white"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                                ${comments}
                            </div>
                        </div>

                        ${node.is_video ? `
                            <div class="absolute top-2 right-2 w-6 h-6 bg-black/50 backdrop-blur-md rounded-lg flex items-center justify-center text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="m7 4 12 8-12 8V4z"/></svg>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Event Listeners
if (instaSearch) {
    instaSearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            fetchInstaPosts();
        }
    });
}
