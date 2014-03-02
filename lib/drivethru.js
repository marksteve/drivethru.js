/** @jsx React.DOM */

window.drivethru = (function() {

  var Auth = React.createClass({
    auth: function() {
      this.props.onAuth();
    },
    render: function() {
      return (
        <div className="dt-auth">
          <p>
            <button
              onClick={this.auth}
              >
              Sign in with Google
            </button>
          </p>
        </div>
      );
    }
  });

  var Open = React.createClass({
    getInitialState: function() {
      return {
        error: null
      };
    },
    open: function() {
      var title = this.props.title;
      var rootId = this.props.options.rootId;
      var req = gapi.client.request({
        path: '/drive/v2/files',
        method: 'POST',
        body: {
          title: title,
          parents: [{id: rootId}]
        }
      });
      req.execute((function(res) {
        if (res && !res.error) {
          this.setupPerms(res);
        } else {
          this.setState({
            error: 'Oops. Please try again.'
          });
        }
      }).bind(this));
    },
    setupPerms: function(file) {
      var req = gapi.client.request({
        path: '/drive/v2/files/' + file.id + '/permissions',
        method: 'POST',
        params: {sendNotificationEmails: false},
        body: {
          role: 'reader',
          type: 'anyone',
          additionalRoles: ['commenter']
        }
      });
      req.execute((function(res) {
        if (res && !res.error) {
          location.reload();
        } else {
          error: 'Oops. Please try again.'
        }
      }).bind(this));
    },
    render: function() {
      var openNode;
      if (this.state.error) {
        openNode = <p>{this.state.error}</p>;
      } else {
        openNode = (
          <p>
            <button
              onClick={this.open}
              >
              Allow commenting for this page.
            </button>
          </p>
        );
      }
      return <div className="dt-open">{openNode}</div>;
    }
  });

  var Comment = React.createClass({
    render: function() {
      var comment = this.props.data;
      var replyNodes = (comment.replies || []).map(function(reply) {
        return <Comment key={reply.replyId} data={reply} />;
      });
      return (
        <li>
          <div className="dt-comment-author">
            <img src={comment.author.picture.url} />
            <span className="dt-comment-author-name">{comment.author.displayName}</span>
          </div>
          <div className="dt-comment-content">
            <p dangerouslySetInnerHTML={{__html: comment.htmlContent}} />
          </div>
          <div className="dt-replies">
            <ul>{replyNodes}</ul>
          </div>
        </li>
      );
    }
  });

  var Comments = React.createClass({
    getInitialState: function() {
      return {
        comments: null
      }
    },
    componentWillMount: function() {
      var req = gapi.client.request({
        path: '/drive/v2/files/' + this.props.file.id + '/comments',
        method: 'GET'
      });
      req.execute((function(res) {
        if (res && !res.error) {
          this.setState({
            comments: res.items
          });
          this.props.options.onLoad(res.items, this);
        }
      }).bind(this));
    },
    render: function() {
      var commentNodes;
      if (this.state.comments) {
        if (this.state.comments.length > 0) {
          commentNodes = this.state.comments.map(function(comment) {
            return <Comment key={comment.commentId} data={comment} />;
          });
        } else {
          commentNodes = [
            <li key="no-comments">No comments yet.</li>
          ];
        }
      } else {
        commentNodes = [
          <li key="loading-comments">Loading comments...</li>
        ];
      }
      return (
        <div className="dt-comments">
          <ul>{commentNodes}</ul>
        </div>
      );
    }
  });

  return {
    scopes: [
      'https://www.googleapis.com/auth/drive',
    ],
    configure: function(options) {
      if (!options.el) throw "Element not supplied";
      if (!options.clientId) throw "Client ID not supplied";
      if (!options.apiKey) throw "API key not supplied";
      if (!options.rootId) throw "Root ID not spillied";
      options.onLoad = options.onLoad || function(){};
      this.options = options;
      return this;
    },
    checkAuth: function(immediate) {
      immediate = typeof immediate == 'undefined' ? true : immediate;
      gapi.auth.authorize({
        client_id: this.options.clientId,
        scope: this.scopes,
        immediate: immediate
      }, this.handleAuthResult.bind(this));
    },
    handleAuthResult: function(res) {
      React.unmountComponentAtNode(this.options.el);
      var comp;
      if (res && !res.error) {
        this.checkOpen(res);
      } else {
        React.renderComponent(
          <Auth onAuth={this.auth.bind(this)} />,
          this.options.el
        );
      }
    },
    auth: function() {
      this.checkAuth(false);
    },
    checkOpen: function(session) {
      var rootId = this.options.rootId;
      var title = location.pathname.replace(/[^\w]+/g, '_');
      var req = gapi.client.request({
        path: '/drive/v2/files/' + rootId + '/children',
        method: 'GET',
        params: {
          q: "title = '" + title + "'"
        }
      });
      req.execute((function(res) {
        if (res && !res.error && res.items.length > 0) {
          var file = res.items[0];
          comp = <Comments options={this.options} file={file} session={session} />;
        } else {
          comp = <Open options={this.options} title={title} />;
        }
        React.renderComponent(comp, this.options.el);
      }).bind(this));
    },
    init: function() {
      gapi.client.setApiKey(this.options.apiKey);
      setTimeout(this.checkAuth.bind(this), 1);
      return this;
    }
  };

})();