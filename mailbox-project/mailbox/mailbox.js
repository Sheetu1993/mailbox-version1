
// Constant kept to temporarily hold all the email data
var allEmails = {};

// Different data-types for email folders
const COMPOSE  = 'compose';
const INBOX    = 'inboxEmails';
const TRASH    = 'trash';
const SENT     = 'sent';
const DRAFT    = 'draft';

// The method updates the folder in the real time database
// It could have also be done incremental. For each data item updated. For now , saving all the data
const updateMailsInFirebase = (emails,dataType)=>{  
    return new Promise((resolve, reject) => {
        jQuery.ajax(
            {
                url: 'https://database-c362b.firebaseio.com/allEmails/'+dataType+'/mails.json',
                type: "PUT",
                dataType: "json",
                data: JSON.stringify(emails),
                success: function (data) {
                    resolve(data)
                },
                error: function (error) {
                    reject(error)
                },
            });
    });   
}

// Method fetches all the emails for the first time
// Ajax could have been implemented incremental, on click of each menu, However due to shortage fetching all details
const fetchAndUpdateEmailData = ()=>{
    
    jQuery.ajax(
        {
            url: 'https://database-c362b.firebaseio.com/allEmails.json',
            type: "GET",
            beforeSend: function()
            {
                $("#list-data").empty();
                $("#list-data").append($($('.loading-container').html()).clone());
            },
            success: function(response)
            {
                allEmails = response;

                // Click the first menu Item
                $('.menu-item[data-id="'+INBOX+'"]').click();

                // Update the counters
                updateCounters();
            }
        });
}

// Binding the ready to the document
(function($, window, document){

    // Binding on click event each item in email menu Item
    $('.menu-item').click(function(){
       showEmailList($(this));
       clearEmailContent();
    });

    // Binding on click event each email item
    $('#list-data').on('click', '.list-item', function() 
    { 
        showEmailContent($(this));
        updateReadInformation($(this));
    });

    // Binding on click event each trash icon
    $('#preview-content').on('click', '.trash', function() {
        trashEmail($(this));
     });

     fetchAndUpdateEmailData();

}(window.jQuery, window, document));


// shows the dynamic list of emails for a menu Item
const showEmailList = (elementClicked)=>
{
    $('.selected-menu-item').removeClass('selected-menu-item');
    $(elementClicked).addClass('selected-menu-item');
    printMails(allEmails, $(elementClicked).attr('data-id'));
}

// prints the emails for a folder
const  printMails = (inboxMails, dataType)=>
{
    $('#list-data').empty();
    
    // If there is data in the list, print the content otherwise show no data to display
    if(inboxMails[dataType] && inboxMails[dataType]['mails'].length != 0)
    {
        var emailsForAFolder = inboxMails[dataType]['mails'];

        // Print the emails from the list
        for(let i=0; i<emailsForAFolder.length;i++)
        {
            let email = emailsForAFolder[i];
            printMail(email, dataType);
        }
    }
    else
    {
        $('#list-data').append($($('.no-data-container').html()).clone());
    }
    
}

// Prints a single email as list Item in the folder
const printMail = (email, dataType)=>
{
    if(email)
    {
        let $listItem = $($('.list-container').html()).clone();
        $listItem.attr({'data-id':email.id,'data-type':dataType});
        $listItem.find('.list-title').text(email.Title);
        $listItem.find('.name').text(email.userName);
        $listItem.find('.date').text(email.Date);

        // Show the read icon if the email is not read yet
        if(email.isRead === 0 && dataType === INBOX)
        {
            $listItem.find('.list-read-info').addClass('las la-dot-circle');
        }
        $('#list-data').append($listItem);
    }  
}

// Updates the counter details for all the menu items in the folder
const updateCounters = ()=>
{
    // Updates the counter for each of the menu item in the list
    $('.menu-item').each(function(){
       updateCounter($(this));
    });
}

// Updates the counter details for each menu item in the folder
const updateCounter = (element)=>
{
    const dataId = $(element).attr('data-id');
    var emailsForFolder = allEmails[$(element).attr('data-id')];
    var count = 0;
    if(emailsForFolder && emailsForFolder['mails'])
    {
        // For inbox folder fetch only the emails that are not read yet
        if(dataId===INBOX)
            count = emailsForFolder['mails'].filter((email)=> email && email.isRead === 0).length;
        else
            count = emailsForFolder['mails'].length-1;
    }

    // Display the counter with the menu-item
    $(element).find('.counter').text(count);
}

// The method shows the email content in the preview section
const showEmailContent = (element)=>
{
    $('.selected-item').removeClass('selected-item');
    $(element).addClass('selected-item');
    var dataId = $(element).attr('data-id');
    var dataType = $(element).attr('data-type');

    var emails = allEmails[dataType]['mails'];
    if(emails)
    {
        var email = emails.filter(( obj ) =>obj && obj.id === parseInt(dataId))[0];
        
        if(email)
        {
            // Prepare data for the preview
            let $listItem = $($('.preview-container').html()).clone();
            $listItem.attr({'data-id':email.id,'data-type':dataType});
            $listItem.find('.title').text(email.Title);
            $listItem.find('.author-name').text(email.userName);
            $listItem.find('.date').text(email.Date);
            $listItem.find('#body-content').text(email.Description);
            $listItem.find('.trash').attr({'data-id':email.id,'data-type':dataType});

            if( dataType !== INBOX)
            {
                $listItem.find('.trash').addClass('display-none');
            }
            $('#preview-content').html($listItem);
        }
       

    }
}

// The method sets the email as read once user clicks to preview the content
const updateReadInformation = (elementClicked)=>
{
    var dataId = $(elementClicked).attr('data-id');
    var dataType = $(elementClicked).attr('data-type');

    var emails = allEmails[dataType]['mails'];
    if(emails)
    {
        var readEmail = emails.filter(( obj ) =>obj && obj.id === parseInt(dataId))[0];
        if(readEmail)
        {
            readEmail.isRead = 1;

            // Once the email is updated in the real time DB, change the counter and mark the email as read
            updateMailsInFirebase(allEmails[dataType]['mails'], dataType).then((value) => {
                $(elementClicked).find('.list-read-info').removeClass('las la-dot-circle');
                updateCounter($('.menu-item[data-id="'+dataType+'"]'));
              });
        }  
    }

    

}

// The method trashes the email and move the content of the email to the trash folder
const trashEmail = (elementClicked)=>
{
    var dataId = $(elementClicked).attr('data-id');
    var dataType = $(elementClicked).attr('data-type');
    var emails = allEmails[dataType]['mails'];

    if(emails)
    {
        var email = emails.filter(( obj ) =>obj && obj.id === parseInt(dataId))[0];
        
        if(email)
        {
            var trashMails = allEmails[TRASH];

            const emailToTrash = emails.filter(( obj ) =>obj && obj.id === parseInt(dataId))[0];
            
            // Initialize trash emails if it does not exist or has no item as of now
            if(!trashMails['mails'])
            {
                trashMails['mails'] =[];
            }
            trashMails['mails'].push(emailToTrash);

            allEmails[dataType]['mails'] = emails.filter(( obj ) =>obj && obj.id !== parseInt(dataId));

            // Update emails in the real time DB
            Promise.all([ updateMailsInFirebase(allEmails[dataType]['mails'], dataType),
                         updateMailsInFirebase(trashMails['mails'], 'trash')]).then((values) => {
               
                    updateCounter($('.menu-item[data-id="'+TRASH+'"]'));
                    clearEmailContent();
                    if(emails.length == 0)
                        $('#list-data').append($($('.no-data-container').html()).clone());
                    removeListFromFolder(dataId, dataType);
              });
        }
    }
}


/**** Utility Methods starts here */

const clearEmailContent = ()=>{ $('#preview-content').html("");}

const removeListFromFolder = (dataId, dataType)=>{ $('.list-item[data-id='+dataId+'][data-type='+dataType+']').remove(); }

/**** Utility Methods ends  here */