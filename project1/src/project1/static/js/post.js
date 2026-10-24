

// Add post comments
let commentForm = document.getElementById('commentForm');
commentForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    let commentInput = document.getElementById('commentInput');
    let comments = document.getElementById('commentList');
    let comment = commentInput.value;
    let noComment = document.getElementById('noComment');

    if (comment.trim() === '') {
        return; 
    }

    let response = await fetch(commentForm.action, {
        method: 'POST',
        body: new FormData(commentForm)
    });
    let data = await response.json();
    let newCommentContainer = document.createElement('div');
    newCommentContainer.class = 'comment';
    
    let author = document.createElement('p');
    author.textContent = data.author;

    let time = document.createElement('p');
    time.textContent = `Date: ${data.time}`;

    let commentText = document.createElement('p');
    commentText.textContent = `Comment: ${data.comment}`;

    newCommentContainer.append(author, time, commentText);
    comments.appendChild(newCommentContainer);
})