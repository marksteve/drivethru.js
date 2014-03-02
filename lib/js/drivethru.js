/** @jsx React.DOM */

window.drivethru = (function() {

  var Auth = React.createClass({displayName: 'Auth',
    auth: function() {
      this.props.onAuth();
    },
    render: function() {
      return (
        React.DOM.div( {className:"dt-auth"}, 
          React.DOM.p(null, 
            React.DOM.button(
              {onClick:this.auth}
              , 
              "Sign in with Google"
            )
          )
        )
      );
    }
  });

  var Open = React.createClass({displayName: 'Open',
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
        openNode = React.DOM.p(null, this.state.error);
      } else {
        openNode = (
          React.DOM.p(null, 
            React.DOM.button(
              {onClick:this.open}
              , 
              "Allow commenting for this page."
            )
          )
        );
      }
      return React.DOM.div( {className:"dt-open"}, openNode);
    }
  });

  var Comment = React.createClass({displayName: 'Comment',
    render: function() {
      var comment = this.props.data;
      var replyNodes = (comment.replies || []).map(function(reply) {
        return Comment( {key:reply.replyId, data:reply} );
      });
      return (
        React.DOM.li(null, 
          React.DOM.div( {className:"dt-comment-author"}, 
            React.DOM.img( {src:comment.author.picture.url} ),
            React.DOM.span( {className:"dt-comment-author-name"}, comment.author.displayName)
          ),
          React.DOM.div( {className:"dt-comment-content"}, 
            React.DOM.p( {dangerouslySetInnerHTML:{__html: comment.htmlContent}} )
          ),
          React.DOM.div( {className:"dt-replies"}, 
            React.DOM.ul(null, replyNodes)
          )
        )
      );
    }
  });

  var Comments = React.createClass({displayName: 'Comments',
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
            return Comment( {key:comment.commentId, data:comment} );
          });
        } else {
          commentNodes = [
            React.DOM.li( {key:"no-comments"}, "No comments yet.")
          ];
        }
      } else {
        commentNodes = [
          React.DOM.li( {key:"loading-comments"}, "Loading comments...")
        ];
      }
      return (
        React.DOM.div( {className:"dt-comments"}, 
          React.DOM.ul(null, commentNodes)
        )
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
          Auth( {onAuth:this.auth.bind(this)} ),
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
          comp = Comments( {options:this.options, file:file, session:session} );
        } else {
          comp = Open( {options:this.options, title:title} );
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