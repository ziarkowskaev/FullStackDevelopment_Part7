import { useState, useEffect, useRef } from 'react';
import Blog from './components/Blog';
import Notification from './components/Notification';
import blogService from './services/blogs';
import loginService from './services/login';
import BlogForm from './components/BlogForm';
import LoginForm from './components/LoginForm';
import Togglable from './components/Togglable';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useNotificationDispatch } from './NotificationContex';
import { useUserDispatch, useUserValue } from './UserContext';
const App = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginVisible, setLoginVisible] = useState(false);

    const blogFormRef = useRef();

    const queryClient = useQueryClient();
    const dispatchNotification = useNotificationDispatch();
    const dispatchUser = useUserDispatch();
    const userValue = useUserValue();
    const user = userValue.user
    
    useEffect(() => {
        const loggedUserJSON = window.localStorage.getItem('loggedNoteappUser');
        if (loggedUserJSON) {
            const user = JSON.parse(loggedUserJSON);
            dispatchUser({ type: 'LOGIN', payload: user });
            blogService.setToken(user.token);
        }
    }, [dispatchUser]);

    function compareBlogs(a, b) {
        return a.likes < b.likes;
    }

    const loginUserMutation = useMutation({
        mutationFn: loginService.login,
        onSuccess: (user) => {
            window.localStorage.setItem(
                'loggedBlogappUser',
                JSON.stringify(user),
            );
            blogService.setToken(user.token);
            dispatchUser({ type: 'LOGIN', payload: user });
            setUsername('');
            setPassword('');
            dispatchNotification({
                type: 'SET_NOTIFICATION',
                payload: { message: `Logged in user ${user.username}` },
            });
        },
        onError: (error) => {
            dispatchNotification({
                type: 'SET_NOTIFICATION',
                payload: { message: `Wrong credentials` },
            });
        },
    });
    const handleLogin = async (event) => {
        event.preventDefault();
        loginUserMutation.mutate({ username, password });
    };
    const handleLogOut = async (event) => {
        window.localStorage.removeItem('loggedNoteappUser');
        dispatchUser({ type: 'LOGOUT' });
    };

    const loginForm = () => {
        const hideWhenVisible = { display: loginVisible ? 'none' : '' };
        const showWhenVisible = { display: loginVisible ? '' : 'none' };

        return (
            <div>
                <div style={hideWhenVisible}>
                    <button onClick={() => setLoginVisible(true)}>
                        Log in
                    </button>
                </div>
                <div style={showWhenVisible}>
                    <LoginForm
                        username={username}
                        password={password}
                        handleUsernameChange={({ target }) =>
                            setUsername(target.value)
                        }
                        handlePasswordChange={({ target }) =>
                            setPassword(target.value)
                        }
                        handleSubmit={handleLogin}
                    />
                    <button onClick={() => setLoginVisible(false)}>
                        cancel
                    </button>
                </div>
            </div>
        );
    };

    const updateBlogMutation = useMutation({
        mutationFn: blogService.update,
        onSuccess: (updatedBlog) => {
            queryClient.invalidateQueries({ queryKey: ['blogs'] });
            dispatchNotification({
                type: 'SET_NOTIFICATION',
                payload: { message: `blog '${updatedBlog.title}' liked` },
            });
        },
    });
    const addLike = (blog) => {
        updateBlogMutation.mutate({ ...blog, likes: blog.likes + 1 });
    };

    const deleteBlogMutation = useMutation({
        mutationFn: blogService.deleteBlog,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['blogs'] });
            dispatchNotification({
                type: 'SET_NOTIFICATION',
                payload: { message: `blog deleted` },
            });
        },
    });

    const deleteBlog = (blog) => {
        deleteBlogMutation.mutate({ ...blog });
    };

    const result = useQuery({
        queryKey: ['blogs'],
        queryFn: blogService.getAll,
        retry: false,
    });

    // console.log(JSON.parse(JSON.stringify(result)))

    if (result.isLoading) {
        return <div>loading data...</div>;
    }
    if (result.isError) {
        return <span>Error: {result.error.message}</span>;
    }

    const blogs = result.data.sort(compareBlogs);
    return (
        <div>
            <h2>Blogs</h2>
            <Notification />

            {!userValue.auth && loginForm()}

            {userValue.auth && (
                <div>
                    <div>
                        {user.username} logged in
                        <button onClick={() => handleLogOut()}>Log out</button>
                    </div>

                    <Togglable buttonLabel="New Blog" ref={blogFormRef}>
                        <BlogForm />
                    </Togglable>
                    {blogs.map((blog) => (
                        <Blog
                            key={blog.id}
                            blog={blog}
                            handleLike={addLike}
                            authUser={user.id}
                            handleDelete={deleteBlog}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default App;
