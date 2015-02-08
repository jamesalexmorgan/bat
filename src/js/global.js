


/* 
*     
* ----------------- CONTENTS -----------------
*     
*     
*     1. Initial code
*       1.1 User vars
*       1.2 DECLARE APP
*       1.3 Filters
*         1.3.1 prettifyJson
*         1.3.2 prettifyDate
*         1.3.3 idsString
*         1.3.4 statusColor
*         1.3.5 metadataFieldNameFormat
*       1.4 Factories
*       1.5 DECLARING CONTROLLER
*     
*     2. Static data  
*       2.1 vars
*       2.2 Asset Statuses
*       2.3 Asset Type Codes
*       2.4 jsAPI actions list
*     
*     3. Helper functions  
*       3.1 convertCsvToArray
*       3.2 checkValidCsv
*       3.3 prettifyName
*       3.4 divideArray
*       3.5 removeFromArray
*       3.6 executeBatchFunctions
*       3.7 Chunk Batch Functions
*       3.8 Keywords replacement    
* 
*     4. User Interface  
*       4.1 Loading overlay  
*       4.2 Selected Assets
*       4.3 Control Panel Tab
*       4.4 RHC functions
*         4.4.1 Search
*         4.4.2 Display Field
*         4.4.3 Sortin
*         4.4.4 Pretty Date
*     
*     5 Get Data Function
*       5.1 Vars
*       5.2 Step One
*       5.3 Step Two
*       5.4 Step THREE
*       5.5 Make Batch function
*       5.6 Load Asset Data Se
*       5.7 Get Metadata field
*     
*     6 Execute Actions
*       6.1 Vars and helpers
*       6.3 Prepare actions batch functions
*         6.3.1 Prepare batch functions (single
*         6.3.2 Prepare batch functions (multiple)
*         6.3.3 Prepare chunk
*         6.3.4 Set vars
*     
*     7. Bulk CSV Change
*       7.1 Vars and helpers
*       7.2 Check for changes
*         7.2.1 Step One
*         7.2.2 Step Two
*       7.3 Convert Csv To Array of assets
*       7.4 Execute Changes
*       7.5 Make Batch Functions
*     
*     8. Bulk Create
*     
*     9. Structure Create
*     
*     10. IA Convert
*     
*     11.
*     
*     12.
*     
*     13.
*     
*     14. 
*     
*     15. Reporting
*       15.1 Message
*       15.2 Get CSV
*       15.3 Error checking
*     
*     16. Config Panel
*     
*     
*     
*/






/*****************************************************************/
/*****************************************************************/
/*****************************************************************/
/************************  1. Initial code  **********************/
/*****************************************************************/
/*****************************************************************/
/*****************************************************************/

/*****************************************************************/
/*********************  1.1 User vars  ***************************/
/*****************************************************************/

userVarFieldsDisplayDefaults = ['name','created','created_username','updated','updated_username'];
userVarTypeCodesDefaults = ['page_standard','page_asset_listing','file','image','folder','form'];


/*****************************************************************/
/*********************  1.2 DECLARE APP  *************************/
/*****************************************************************/

var bulkAssetApp = angular.module('bulkAssetApp', []);



/*****************************************************************/
/*********************  1.3 Filters  *************************/
/*****************************************************************/

/*********************  1.3.1 prettifyJson  *************************/

bulkAssetApp.filter('prettifyJson', function() {
  return function(input) {
    if(typeof input === 'string') {
      return input;
    }else{
      return JSON.stringify(input, null, '\t');  
    } 
  };
});



/*********************  1.3.2 prettifyDate  *************************/

bulkAssetApp.filter('prettifyDate', function() {
  return function(string,format,enabled,manualFormat) {
    if(enabled && string) {//string empty produces now so avoid that
      var date = null;

      if(String(string).match(/\d{10}/) !== null) { //if 10 digit unix format
        date = moment(string,'X'); //X is the format code for the unix date
      }

      //if not unix date then try just parsing it
      if(date === null) {
        date = moment(string);
      }

      if(date.isValid()) {
        if(manualFormat) {
          return date.format(format);
        }else{
          return date.fromNow();  
        }
      }

      return string;
      //TODO might want to decide which fields are dates
    }

    return string;
  };
});


/*********************  1.3.3 idsString  *************************/

bulkAssetApp.filter('idsString', function() {
  return function(assets) {
    var ids = [];
    _.each(assets,function(asset) {
      ids.push(asset.id);
    });
    var idString = ids.toString();
    if(idString === '') {
      idString = 'None selected';
    }
    return idString;
  };
});


/*********************  1.3.4 statusColor  *************************/

bulkAssetApp.filter('statusColor', function() {
  return function(statusName,statuses) {
    return _.where(statuses,{name:statusName})[0].color;
  };
});


/*********************  1.3.5 metadataFieldNameFormat  *************************/

bulkAssetApp.filter('metadataFieldNameFormat', function() {
  return function(field,showId) {
    if(field.isMetadata) {
      if(field.meta_id) {
        return field.id + ' (#' + field.meta_id + ')';
      }else{
        return field.id + ' (#??Deleted??)'; //very unlikely, assets, still have field.meta_id
      }

      return field.id + ' (#' + field.meta_id + ')';
    }else{
      var returnVal = field.name;
      if(showId) {
        return field.name + ' (' + field.id + ')';
      }else{
        return field.name;
      }
      
    }
  };
});

/*********************  1.3.5 metadataFieldIdFormat  *************************/

bulkAssetApp.filter('metadataFieldIdFormat', function() {
  return function(field) {
    if(field.isMetadata) {
      if(field.meta_id) {
        return field.meta_id;
      }else{
        return '?Deleted?'; //very unlikely, assets, still have field.meta_id
      }
    }else{
      return field.id;
    }
  };
});

/*****************************************************************/
/*********************  1.4 Factories  *************************/
/*****************************************************************/


bulkAssetApp.factory('jspAPIService', function($q) {
  var executeBatch = function(batchFunctions,callback) {
    var results = [];
    var defer = $q.defer();

    jsAPI.batchRequest({
       "functions":batchFunctions,
       "dataCallback":function(result) {
          defer.resolve(result);          
       }
    });

    defer.promise.then(function(results) {
      callback(results);
    });
  };

  return {
    executeBatch: executeBatch
  };
});

 
/*****************************************************************/
/*****************  1.5 DECLARING CONTROLLER  ********************/
/*****************************************************************/

bulkAssetApp.controller('ControllerMain', function($scope, $filter, jspAPIService) {




  /*****************************************************************/
  /*****************************************************************/
  /*****************************************************************/
  /************************  2. Static data  ***********************/
  /*****************************************************************/
  /*****************************************************************/
  /*****************************************************************/

  /**************************  2.1 vars  ***************************/

  
  /*********************  2.2 Asset Statuses  **********************/

  $scope.matrixAssetStatuses = [
      {"id":"1","name":"Archived",color:"C2B0A0"},
      {"id":"32","name":"Up for Review",color:"50D000"},
      {"id":"2","name":"Under Construction",color:"AACCDD"},
      {"id":"64","name":"Safe Editing",color:"F25C86"},
      {"id":"4","name":"Pending Approval",color:"CC7CC7"},
      {"id":"128","name":"Safe Editing Pending Approval",color:"CC7CC7"},
      {"id":"8","name":"Approved to go Live",color:"F4D425"},
      {"id":"256","name":"Safe Editing Approved to go Live",color:"FF9A00"},
      {"id":"16","name":"Live",color:"DBF18A"}
  ];

  
  /*******************  2.3 Asset Type Codes  **********************/

  $scope.loadAssetsTypeCodesAll = [
      {"name":"Authentication","id":"authentication"},
      {"name":"Default Authentication","id":"authentication_default"},
      {"name":"IPB Authentication","id":"authentication_ipb"},
      {"name":"LDAP Authentication","id":"authentication_ldap"},
      {"name":"Bodycopy","id":"bodycopy"},
      {"name":"Simple Edit Layout","id":"layout"},
      {"name":"Multiple Page Page","id":"page_multiple_page_page"},
      {"name":"Paint Layout Bodycopy","id":"paint_layout_bodycopy"},
      {"name":"Bodycopy Container","id":"bodycopy_container"},
      {"name":"Bodycopy Div","id":"bodycopy_div"},
      {"name":"Bodycopy Table","id":"bodycopy_table"},
      {"name":"Bulkmail Post Office","id":"bulkmail_post_office"},
      {"name":"Bulkmail Job","id":"bulkmail_job"},
      {"name":"Bulkmail Manager","id":"bulkmail_manager"},
      {"name":"Bulkmail User","id":"bulkmail_user"},
      {"name":"Cache Manager","id":"cache_manager"},
      {"name":"Abstract Cache Storage Mechanism","id":"cache_storage"},
      {"name":"Default Cache Storage","id":"cache_storage_default"},
      {"name":"Memcache Cache Storage","id":"cache_storage_memcache"},
      {"name":"Redis Cache Storage","id":"cache_storage_redis"},
      {"name":"Abstract Calendar Event","id":"calendar_event"},
      {"name":"Recurring Event Cancellation","id":"calendar_event_cancellation"},
      {"name":"Recurring Event Modification","id":"calendar_event_modification"},
      {"name":"Recurring Calendar Event","id":"calendar_event_recurring"},
      {"name":"Single Calendar Event","id":"calendar_event_single"},
      {"name":"Multi-Date Calendar Event","id":"calendar_event_multi_date"},
      {"name":"Checkout Action","id":"checkout_action"},
      {"name":"Call REST Resource","id":"checkout_action_call_rest_resource"},
      {"name":"Save XML","id":"checkout_action_save_xml"},
      {"name":"CMIS Bridge","id":"cmis_bridge"},
      {"name":"Condition","id":"condition"},
      {"name":"Admin Access Condition","id":"condition_admin_access"},
      {"name":"Asset Status Condition","id":"condition_asset_status"},
      {"name":"Asset Type Condition","id":"condition_asset_type"},
      {"name":"Form Posted Condition","id":"condition_form_posted"},
      {"name":"Has Children Condition","id":"condition_has_children"},
      {"name":"In User Group Condition","id":"condition_in_user_group"},
      {"name":"Keyword Regexp Condition","id":"condition_keyword_regexp"},
      {"name":"Logged In Condition","id":"condition_logged_in"},
      {"name":"Logical Condition","id":"condition_logical"},
      {"name":"Server Variable Condition","id":"condition_server_variable"},
      {"name":"Simple Edit Mode Condition","id":"condition_simple_edit_mode"},
      {"name":"User Agent Condition","id":"condition_user_agent"},
      {"name":"User Frequency Condition","id":"condition_user_frequency"},
      {"name":"User IP Condition","id":"condition_user_ip"},
      {"name":"User IPv6 Condition","id":"condition_user_ipv6"},
      {"name":"User Type Condition","id":"condition_user_type"},
      {"name":"Write Access Condition","id":"condition_write_access"},
      {"name":"Content Type","id":"content_type"},
      {"name":"Code Content Type","id":"content_type_code"},
      {"name":"Image Content Type","id":"content_type_image"},
      {"name":"Markdown Content Type","id":"content_type_markdown"},
      {"name":"Nest Content Content Type","id":"content_type_nest_content"},
      {"name":"Raw HTML Content Type","id":"content_type_raw_html"},
      {"name":"Snippet Content Type","id":"content_type_snippet"},
      {"name":"Structure Tree Content Type","id":"content_type_structure_tree"},
      {"name":"WYSIWYG Content Type","id":"content_type_wysiwyg"},
      {"name":"Cron Job","id":"cron_job"},
      {"name":"Attempt Safe Trash Cron Job","id":"cron_job_attempt_safe_trash"},
      {"name":"Clear Matrix Cache Cron Job","id":"cron_job_clear_matrix_cache"},
      {"name":"Escalate Safe Trash Cron Job","id":"cron_job_escalate_safe_trash"},
      {"name":"Expired Matrix Cache Cron Job","id":"cron_job_expired_matrix_cache"},
      {"name":"Expired Matrix Locks Cron Job","id":"cron_job_expired_matrix_locks"},
      {"name":"Expired WorkFlow Cron Job","id":"cron_job_expired_workflow"},
      {"name":"Funnelback Log Rotation Cron Job","id":"cron_job_funnelback_log_rotation"},
      {"name":"Future Asset Lineage Cron Job","id":"cron_job_future_lineage"},
      {"name":"Future Asset Permission Cron Job","id":"cron_job_future_permission"},
      {"name":"Future Asset Status Cron Job","id":"cron_job_future_status"},
      {"name":"Generate Log Reports Cron Job","id":"cron_job_generate_log_reports"},
      {"name":"Manage Incomplete Submissions Cron Job","id":"cron_job_manage_incomplete_submissions"},
      {"name":"Manage Pending Accounts Cron Job","id":"cron_job_manage_pending_accounts"},
      {"name":"Cron Job Metadata Triggers","id":"cron_job_metadata_triggers"},
      {"name":"Queue Scheduled Bulkmail Job","id":"cron_job_queue_scheduled_job"},
      {"name":"Refresh Cache Cron Job","id":"cron_job_refresh_cache"},
      {"name":"Regenerate Report Cron Job","id":"cron_job_regenerate_report"},
      {"name":"Remove SOAP Response Files Cron Job","id":"cron_job_remove_soap_response_files"},
      {"name":"Send Submission Log Cron Job","id":"cron_job_send_submission_log"},
      {"name":"Purge Squid Cache Cron Job","id":"cron_job_squid_cache_purge"},
      {"name":"Sync CMIS Bridges Cron Job","id":"cron_job_sync_cmis_bridges"},
      {"name":"Sync Squiz Suite Products Cron Job","id":"cron_job_sync_suite_products"},
      {"name":"Update Sharepoint Record Cron Job","id":"cron_job_update_sharepoint_record"},
      {"name":"Update TRIM Record Cron Job","id":"cron_job_update_trim_record"},
      {"name":"Cron Manager","id":"cron_manager"},
      {"name":"Data Record","id":"data_record"},
      {"name":"Data Source","id":"data_source"},
      {"name":"CSV Data Source","id":"data_source_csv"},
      {"name":"DB Data Source","id":"data_source_db"},
      {"name":"iCal Data Source","id":"data_source_ical"},
      {"name":"JSON Data Source","id":"data_source_json"},
      {"name":"LDAP Data Source","id":"data_source_ldap"},
      {"name":"RSS Data Source","id":"data_source_rss"},
      {"name":"SOAP Data Source","id":"data_source_soap"},
      {"name":"XML Data Source","id":"data_source_xml"},
      {"name":"Weather Company Feed","id":"weatherco_feed"},
      {"name":"Sharepoint Saved Search","id":"sharepoint_saved_search"},
      {"name":"TRIM Saved Search","id":"trim_saved_search"},
      {"name":"Data Source Record Set","id":"data_source_record_set"},
      {"name":"DB Connector","id":"db_connector"},
      {"name":"Decision Tree Question","id":"decision_tree_question"},
      {"name":"Decision Tree Question - Numeric","id":"decision_tree_question_type_numeric"},
      {"name":"Decision Tree Question - Select","id":"decision_tree_question_type_select"},
      {"name":"Design Area","id":"design_area"},
      {"name":"Design","id":"design"},
      {"name":"CSS Design File","id":"design_css"},
      {"name":"CSS File Customisation","id":"design_css_customisation"},
      {"name":"Design Customisation","id":"design_customisation"},
      {"name":"EES Login Design","id":"ees_login_design"},
      {"name":"Login Design","id":"login_design"},
      {"name":"Password Change Design","id":"password_change_design"},
      {"name":"Access History Design Area","id":"design_area_access_history"},
      {"name":"Asset Lineage Design Area","id":"design_area_asset_lineage"},
      {"name":"Body Design Area","id":"design_area_body"},
      {"name":"Colourise Image Design Area","id":"design_area_colourise_image"},
      {"name":"Constant Button Design Area","id":"design_area_constant_button"},
      {"name":"Custom Image Design Area","id":"design_area_custom_image"},
      {"name":"DateTime Design Area","id":"design_area_datetime"},
      {"name":"Declared Vars Design Area","id":"design_area_declared_vars"},
      {"name":"Cart Design Area","id":"design_area_ecommerce_cart"},
      {"name":"Exit Design Area","id":"design_area_exit"},
      {"name":"Head Design Area","id":"design_area_head"},
      {"name":"Javascript Calendar Navigator","id":"design_area_js_calendar_navigator"},
      {"name":"Linked CSS Design Area","id":"design_area_linked_css"},
      {"name":"Login Form Design Area","id":"design_area_login_form"},
      {"name":"Menu Type Design Area","id":"design_area_menu_type"},
      {"name":"Normal Menu Design Area","id":"design_area_menu_normal"},
      {"name":"Recursive Menu Design Area","id":"design_area_menu_recursive"},
      {"name":"Recursive Stalks Menu Design Area","id":"design_area_menu_stalks"},
      {"name":"Metadata Design Area","id":"design_area_metadata"},
      {"name":"Nest Content Design Area","id":"design_area_nest_content"},
      {"name":"Password Change Form Design Area","id":"design_area_password_change_form"},
      {"name":"Request Vars Design Area","id":"design_area_request_vars"},
      {"name":"Searchbox design area","id":"design_area_searchbox"},
      {"name":"Show If Design Area","id":"design_area_show_if"},
      {"name":"Ecommerce Delivery Method","id":"ecommerce_delivery_method"},
      {"name":"Ecommerce Default Delivery Method","id":"default_delivery_method"},
      {"name":"Ecommerce Order","id":"ecommerce_order"},
      {"name":"File","id":"file"},
      {"name":"CSS File","id":"css_file"},
      {"name":"MS Excel Document","id":"excel_doc"},
      {"name":"File Folder","id":"file_folder"},
      {"name":"CSS File Folder","id":"css_file_folder"},
      {"name":"JS File Folder","id":"js_file_folder"},
      {"name":"FLV File","id":"flv_file"},
      {"name":"Image","id":"image"},
      {"name":"Data Source Graph","id":"data_source_graph"},
      {"name":"Thumbnail","id":"thumbnail"},
      {"name":"JS File","id":"js_file"},
      {"name":"MP3 File","id":"mp3_file"},
      {"name":"PDF File","id":"pdf_file"},
      {"name":"MS PowerPoint Document","id":"powerpoint_doc"},
      {"name":"RTF File","id":"rtf_file"},
      {"name":"Text File","id":"text_file"},
      {"name":"Video File","id":"video_file"},
      {"name":"MS Word Document","id":"word_doc"},
      {"name":"XML File","id":"xml_file"},
      {"name":"XSL File","id":"xsl_file"},
      {"name":"File Bridge","id":"file_bridge"},
      {"name":"Folder","id":"folder"},
      {"name":"Authentication Folder","id":"authentication_folder"},
      {"name":"System Designs Folder","id":"designs_folder"},
      {"name":"Metadata Schema","id":"metadata_schema"},
      {"name":"Metadata Section","id":"metadata_section"},
      {"name":"Online Quiz Question Group","id":"online_quiz_question_group"},
      {"name":"Root Folder","id":"root_folder"},
      {"name":"Site","id":"site"},
      {"name":"Web Folder","id":"web_folder"},
      {"name":"Designs Folder","id":"web_folder_designs"},
      {"name":"Media Folder","id":"web_folder_media"},
      {"name":"Users Folder","id":"web_folder_users"},
      {"name":"Web Services Folder","id":"web_folder_web_services"},
      {"name":"Site Network","id":"site_network"},
      {"name":"System Management Folder","id":"system_management_folder"},
      {"name":"Trash Folder","id":"trash_folder"},
      {"name":"Trigger Folder","id":"trigger_folder"},
      {"name":"User Group","id":"user_group"},
      {"name":"IPB User Group","id":"ipb_user_group"},
      {"name":"LDAP User Group","id":"ldap_user_group"},
      {"name":"Role","id":"role"},
      {"name":"System Administrators","id":"system_user_group"},
      {"name":"Workflow Schema","id":"workflow_schema"},
      {"name":"Workflow Step","id":"workflow_step"},
      {"name":"Workspace","id":"workspace"},
      {"name":"Form","id":"form"},
      {"name":"Form","id":"form_email"},
      {"name":"Ecommerce Form","id":"form_ecommerce"},
      {"name":"Form Action","id":"form_action"},
      {"name":"Call REST Resource","id":"form_action_call_rest_resource"},
      {"name":"Create Sharepoint List Item","id":"form_action_create_sharepoint_list_item"},
      {"name":"Run Database Query","id":"form_action_db_query"},
      {"name":"Save as XML","id":"form_action_save_xml"},
      {"name":"Send Email Form Action","id":"form_action_send_email"},
      {"name":"Set Session Var Form Action","id":"form_action_set_session_var"},
      {"name":"Make SOAP Call","id":"form_action_soap_call"},
      {"name":"Submit TRIM Record","id":"form_action_trim_submit"},
      {"name":"Upload YouTube Video","id":"form_action_upload_youtube_video"},
      {"name":"Form Question","id":"form_question"},
      {"name":"Form Question - Date/Time","id":"form_question_type_datetime"},
      {"name":"Form Question - File Upload","id":"form_question_type_file_upload"},
      {"name":"Form Question - Password","id":"form_question_type_password"},
      {"name":"Form Question - Select","id":"form_question_type_select"},
      {"name":"Form Question - Country Selection","id":"form_question_type_country"},
      {"name":"Form Question - Text","id":"form_question_type_text"},
      {"name":"Form Question - Email Address","id":"form_question_type_email_address"},
      {"name":"Form Question - Numeric Field","id":"form_question_type_numeric"},
      {"name":"Form Question - Tickbox List","id":"form_question_type_tickbox_list"},
      {"name":"Form Question - Option List","id":"form_question_type_option_list"},
      {"name":"Form Question - Tickbox Table","id":"form_question_type_tickbox_table"},
      {"name":"Form Question Rule","id":"form_question_rule"},
      {"name":"Form Question Rule - Begins With","id":"form_question_rule_type_begins_with"},
      {"name":"Form Question Rule - Value Comparison","id":"form_question_rule_type_comparison"},
      {"name":"Form Question Rule - Contains","id":"form_question_rule_type_contain"},
      {"name":"Form Question Rule - Valid Email Address","id":"form_question_rule_type_email"},
      {"name":"Form Question Rule - Ends With","id":"form_question_rule_type_ends_with"},
      {"name":"Form Question Rule - File Size","id":"form_question_rule_type_file_size"},
      {"name":"Form Question Rule - File Type","id":"form_question_rule_type_file_type"},
      {"name":"Form Question Rule - File Virus Check","id":"form_question_rule_type_file_virus_check"},
      {"name":"Form Question Rule - Found In","id":"form_question_rule_type_found_in"},
      {"name":"Form Question Rule - Force Integer Value","id":"form_question_rule_type_integer"},
      {"name":"Form Question Rule - Length Comparison","id":"form_question_rule_type_length"},
      {"name":"Form Question Rule - Numeric Value","id":"form_question_rule_type_numeric"},
      {"name":"Form Question Rule - Regular Expression","id":"form_question_rule_type_regexp"},
      {"name":"Form Question Rule - Selection Limit","id":"form_question_rule_type_select_limit"},
      {"name":"Form Question Rule - Selection","id":"form_question_rule_type_selection"},
      {"name":"Form Question Rule - Word Count Comparison","id":"form_question_rule_type_word_count"},
      {"name":"Form Section","id":"form_section"},
      {"name":"Form Section Action","id":"form_section_action"},
      {"name":"Make SOAP Call","id":"form_section_action_soap_call"},
      {"name":"Form Submission","id":"form_submission"},
      {"name":"Order","id":"order"},
      {"name":"Funnelback Manager","id":"funnelback_manager"},
      {"name":"Google Map Location","id":"google_map_location"},
      {"name":"Image Variety","id":"image_variety"},
      {"name":"Import Tool Converter","id":"import_tool_converter"},
      {"name":"Word Import Tool Converter","id":"import_tool_converter_word"},
      {"name":"Import Tools Manager","id":"import_tools_manager"},
      {"name":"Inbox","id":"inbox"},
      {"name":"IPB Bridge","id":"ipb_bridge"},
      {"name":"IPB Forum","id":"ipb_forum"},
      {"name":"IPB Root Forum","id":"ipb_root_forum"},
      {"name":"IPB Topic","id":"ipb_topic"},
      {"name":"IPB Post","id":"ipb_post"},
      {"name":"IPB Poll","id":"ipb_poll"},
      {"name":"Layout Manager","id":"layout_manager"},
      {"name":"LDAP Bridge","id":"ldap_bridge"},
      {"name":"Link","id":"link"},
      {"name":"Abstract Locking Method","id":"locking_method"},
      {"name":"Default Locking Method","id":"locking_method_default"},
      {"name":"Default Locking Method","id":"locking_method_memcache"},
      {"name":"Log Manager","id":"log_manager"},
      {"name":"Lookup Value","id":"lookup_value"},
      {"name":"Paint Layout Lookup Value","id":"paint_layout_lookup_value"},
      {"name":"Metadata Field","id":"metadata_field"},
      {"name":"Metadata Date Field","id":"metadata_field_date"},
      {"name":"Metadata Hierarchy Field","id":"metadata_field_hierarchy"},
      {"name":"Metadata Multiple Text Field","id":"metadata_field_multiple_text"},
      {"name":"Metadata Related Asset Field","id":"metadata_field_related_asset"},
      {"name":"Metadata Selection Field","id":"metadata_field_select"},
      {"name":"Metadata Text Field","id":"metadata_field_text"},
      {"name":"Metadata Thesaurus Field","id":"metadata_field_thesaurus"},
      {"name":"Metadata WYSIWYG Field","id":"metadata_field_wysiwyg"},
      {"name":"Online Quiz Question","id":"online_quiz_question"},
      {"name":"Online Quiz Multiple-Choice Question","id":"online_quiz_question_multichoice"},
      {"name":"Online Quiz Submission","id":"online_quiz_submission"},
      {"name":"Order Line","id":"order_line"},
      {"name":"Page","id":"page"},
      {"name":"Comment","id":"comment"},
      {"name":"Donation","id":"donation"},
      {"name":"Checkout Page","id":"ecommerce_checkout"},
      {"name":"Javascript API","id":"js_api"},
      {"name":"Listing Engine Asset","id":"listing_engine"},
      {"name":"Cart","id":"ecommerce_cart"},
      {"name":"Funnelback Search Page","id":"funnelback_search_page"},
      {"name":"Asset Listing Page","id":"page_asset_listing"},
      {"name":"Google Map","id":"google_map"},
      {"name":"Link Manager Page","id":"page_link_manager"},
      {"name":"Online Quiz","id":"page_online_quiz"},
      {"name":"Related Asset Listing Page","id":"page_related_asset_listing"},
      {"name":"Tag Listing Page","id":"page_tag_listing"},
      {"name":"Hit Count Listing Page","id":"page_hit_count_listing"},
      {"name":"Whats New","id":"page_whats_new"},
      {"name":"Search List","id":"search_list"},
      {"name":"Search Page","id":"search_page"},
      {"name":"Calendar Events Search Page","id":"page_calendar_events_search"},
      {"name":"News Item","id":"news_item"},
      {"name":"Asset Builder Page","id":"page_asset_builder"},
      {"name":"Account Manager Page","id":"page_account_manager"},
      {"name":"SAML Account Manager","id":"saml_account_manager"},
      {"name":"Calendar Page","id":"page_calendar"},
      {"name":"Rolling Calendar Page","id":"page_calendar_rolling"},
      {"name":"Restricted-Period Calendar Page","id":"page_calendar_restricted"},
      {"name":"Custom Form","id":"page_custom_form"},
      {"name":"Ecommerce Form Page","id":"page_custom_form_ecommerce"},
      {"name":"Decision Tree","id":"page_decision_tree"},
      {"name":"Multiple Page","id":"page_multiple_page"},
      {"name":"Password Reset Page","id":"page_password_reset"},
      {"name":"Online Poll","id":"page_poll"},
      {"name":"Redirect Page","id":"page_redirect"},
      {"name":"Remote Content","id":"page_remote_content"},
      {"name":"REST Resource","id":"page_rest_resource"},
      {"name":"Funnelback REST Search Page","id":"funnelback_rest_search_page"},
      {"name":"REST Resource JavaScript","id":"page_rest_resource_js"},
      {"name":"REST Resource OAuth Session","id":"page_rest_resource_oauth_session"},
      {"name":"REST Resource OAuth 2 Legged","id":"page_rest_resource_oauth_two_legged"},
      {"name":"RSS Feed","id":"page_rss_feed"},
      {"name":"Site Map","id":"page_site_map"},
      {"name":"Standard Page","id":"page_standard"},
      {"name":"Paint Layout","id":"paint_layout_page"},
      {"name":"Upcoming Events List","id":"page_upcoming_events_list"},
      {"name":"User Group Manager Page","id":"page_user_group_manager"},
      {"name":"Bulkmail Subscribe Page","id":"bulkmail_subscribe_page"},
      {"name":"Payment Gateway","id":"payment_gateway"},
      {"name":"Datacash Payment Gateway","id":"payment_gateway_datacash"},
      {"name":"DPS Payment Gateway","id":"payment_gateway_dps"},
      {"name":"SecurePay eSec Payment Gateway","id":"payment_gateway_esec"},
      {"name":"PayPal Payflow Pro Payment Gateway","id":"payment_gateway_payflow"},
      {"name":"PayPal Express Checkout Payment Gateway","id":"payment_gateway_paypal_express"},
      {"name":"SagePay Payment Gateway","id":"payment_gateway_sagepay"},
      {"name":"SecurePay Direct Post Payment Gateway","id":"payment_gateway_securepay"},
      {"name":"UTransact Payment Gateway","id":"payment_gateway_utransact"},
      {"name":"Paypal IPN Receiver","id":"paypal_ipn_receiver"},
      {"name":"Paypal Payment Button","id":"paypal_payment_button"},
      {"name":"Product","id":"product"},
      {"name":"Report","id":"report"},
      {"name":"Funnelback Search Log Report","id":"funnelback_search_log_report"},
      {"name":"Log Report","id":"log_report"},
      {"name":"Search Log Report","id":"search_log_report"},
      {"name":"Asset Counter Report","id":"report_asset_counter"},
      {"name":"Asset Statuses Report","id":"report_asset_statuses"},
      {"name":"Incomplete Metadata Report","id":"report_incomplete_metadata"},
      {"name":"Links Report","id":"report_links"},
      {"name":"Safe Trash Report","id":"report_safe_trash"},
      {"name":"Structured Asset Report","id":"structured_asset_info"},
      {"name":"Soap Server","id":"soap_server"},
      {"name":"Squiz Suite Manager","id":"suite_manager"},
      {"name":"Paypal Business Account","id":"paypal_business_account"},
      {"name":"Paypal Configuration","id":"paypal_configuration"},
      {"name":"Paypal Order","id":"paypal_order"},
      {"name":"Physical File","id":"physical_file"},
      {"name":"Physical Folder","id":"physical_folder"},
      {"name":"Poll Question","id":"poll_question"},
      {"name":"Promotional Code","id":"promotional_code"},
      {"name":"Promotional Condition","id":"promotional_condition"},
      {"name":"Promotional Condition Compare Value","id":"promotional_condition_compare_value"},
      {"name":"Promotional Rule","id":"promotional_rule"},
      {"name":"Free Shipping Promotional Rule","id":"promotional_rule_type_free_shipping"},
      {"name":"Quantity Promotional Rule","id":"promotional_rule_type_quantity"},
      {"name":"Remap Manager","id":"remap_manager"},
      {"name":"REST Manager","id":"rest_manager"},
      {"name":"SAML2 Assertion Consumer Service","id":"saml2_acs"},
      {"name":"SAML2 Single Logout Service","id":"saml2_sls"},
      {"name":"Search Folder","id":"search_folder"},
      {"name":"Search Manager","id":"search_manager"},
      {"name":"Abstract Session Handler","id":"session_handler"},
      {"name":"Default Session Handler","id":"session_handler_default"},
      {"name":"Memcache Session Handler","id":"session_handler_memcache"},
      {"name":"Sharepoint Connector","id":"sharepoint_connector"},
      {"name":"Simple Form","id":"simple_form"},
      {"name":"Simple Report","id":"simple_report"},
      {"name":"Most Used Asset Types Report","id":"report_most_used_asset_types"},
      {"name":"Rollback Report","id":"report_rollback"},
      {"name":"Total Assets Report","id":"report_total_assets"},
      {"name":"Internal Messages Report","id":"report_total_internal_messages"},
      {"name":"Trash Age Report","id":"report_trash_age"},
      {"name":"Triggers Report","id":"report_triggers"},
      {"name":"SOAP Server API","id":"soap_api"},
      {"name":"SOAP API Asset Service","id":"soap_api_asset_service"},
      {"name":"SOAP API Design Lookup Service","id":"soap_api_design_lookup_service"},
      {"name":"SOAP API File Retrieval Service","id":"soap_api_file_retrieval_service"},
      {"name":"SOAP API Link Service","id":"soap_api_link_service"},
      {"name":"SOAP API Metadata Service","id":"soap_api_metadata_service"},
      {"name":"SOAP API Permission And Role Service","id":"soap_api_permission_role_service"},
      {"name":"SOAP API Search Service","id":"soap_api_search_service"},
      {"name":"SOAP API System Service","id":"soap_api_system_service"},
      {"name":"SOAP API Workflow Service","id":"soap_api_workflow_service"},
      {"name":"Base System","id":"squiz_suite_system"},
      {"name":"Search System","id":"squiz_suite_system_search"},
      {"name":"Squiz Suite System","id":"squiz_suite_system_suite"},
      {"name":"Tag Manager","id":"tag_manager"},
      {"name":"Thesaurus","id":"thesaurus"},
      {"name":"Thesaurus Term","id":"thesaurus_term"},
      {"name":"Tools","id":"tool"},
      {"name":"Asset Sorting Tool","id":"tool_asset_sorter"},
      {"name":"Bulk File Import Tool","id":"tool_bulk_file_import"},
      {"name":"Change Thesaurus Term","id":"tool_change_thesaurus_term"},
      {"name":"Clear Matrix Cache","id":"tool_clear_matrix_cache"},
      {"name":"Clear Squid Cache","id":"tool_clear_squid_cache"},
      {"name":"Delete Bulkmail Users","id":"tool_delete_bmail_users"},
      {"name":"Export Assets to XML Tool","id":"tool_export_assets_to_xml"},
      {"name":"Export Files","id":"tool_export_files"},
      {"name":"Export Online Quiz to XML Tool","id":"tool_export_online_quiz_to_xml"},
      {"name":"Import Assets from XML Tool","id":"tool_import_assets_from_xml"},
      {"name":"Import Bulkmail Users","id":"tool_import_bmail_user"},
      {"name":"Import File Tool","id":"tool_import_file"},
      {"name":"Mass Clone Tool","id":"tool_mass_clone"},
      {"name":"Re-Indexing Tool","id":"tool_reindex"},
      {"name":"Rollback Management","id":"tool_rollback_management"},
      {"name":"Global Search and Replace","id":"tool_search_replace"},
      {"name":"Structured File Import Tool","id":"tool_structured_file_import"},
      {"name":"Trigger","id":"trigger"},
      {"name":"Trigger Action","id":"trigger_action"},
      {"name":"Add Remap","id":"trigger_action_add_assetid_remap"},
      {"name":"Add URL","id":"trigger_action_add_url"},
      {"name":"Add Web Path","id":"trigger_action_add_web_path"},
      {"name":"Calculate Average Comment Rating","id":"trigger_action_calculate_average_comment_rating"},
      {"name":"Call REST Resource","id":"trigger_action_call_rest_resource"},
      {"name":"Clear Matrix Cache","id":"trigger_action_clear_cache"},
      {"name":"Set Cache Expiry","id":"trigger_action_set_cache_expiry"},
      {"name":"Clear Session Var","id":"trigger_action_clear_session_var"},
      {"name":"Create Asset","id":"trigger_action_create_asset"},
      {"name":"Create Clone and Link to Asset","id":"trigger_action_create_clone"},
      {"name":"Create Design Customisation","id":"trigger_action_create_design_customisation"},
      {"name":"Create File Asset","id":"trigger_action_create_file_asset"},
      {"name":"Create Image Variety","id":"trigger_action_create_image_variety"},
      {"name":"Create Link","id":"trigger_action_create_link"},
      {"name":"Decrement Hit Count","id":"trigger_action_decrement_hit_count"},
      {"name":"Delete Bulkmail User","id":"trigger_action_delete_bmail_user"},
      {"name":"Delete Future Lineage","id":"trigger_action_delete_future_lineage"},
      {"name":"Delete Future Permission","id":"trigger_action_delete_future_permission"},
      {"name":"Delete Future Status","id":"trigger_action_delete_future_status"},
      {"name":"Delete Image Variety","id":"trigger_action_delete_image_variety"},
      {"name":"Execute Database Query","id":"trigger_action_execute_database_query"},
      {"name":"Fail","id":"trigger_action_fail"},
      {"name":"Increment Hit Count","id":"trigger_action_increment_hit_count"},
      {"name":"Increment Version Number","id":"trigger_action_increment_version"},
      {"name":"Issue Counter Value","id":"trigger_action_issue_counter_value"},
      {"name":"Join User Group for Session","id":"trigger_action_join_user_group_for_session"},
      {"name":"Leave User Group for Session","id":"trigger_action_leave_user_group_for_session"},
      {"name":"Log in Invision Power Board","id":"trigger_action_login_ipb"},
      {"name":"Log out Invision Power Board","id":"trigger_action_logout_ipb"},
      {"name":"Make SOAP Call","id":"trigger_action_make_soap_call"},
      {"name":"Clear Squid Cache","id":"trigger_action_purge_squid_cache"},
      {"name":"Redirect to URL","id":"trigger_action_redirect"},
      {"name":"Release Lock","id":"trigger_action_release_lock"},
      {"name":"Reload User","id":"trigger_action_reload_user"},
      {"name":"Remove Future Lineage Cron Job","id":"trigger_action_remove_future_lineage_cron"},
      {"name":"Remove Links","id":"trigger_action_remove_links"},
      {"name":"Remove Metadata Schema","id":"trigger_action_remove_metadata_schema"},
      {"name":"Remove Asset Remaps","id":"trigger_action_remove_remaps"},
      {"name":"Remove Web Path","id":"trigger_action_remove_web_path"},
      {"name":"Remove Workflow Schema","id":"trigger_action_remove_workflow_schema"},
      {"name":"Replace File Asset","id":"trigger_action_replace_file_asset"},
      {"name":"Reset Hit Count","id":"trigger_action_reset_hit_count"},
      {"name":"Schedule Bulkmail Job","id":"trigger_action_schedule_bulkmail_job"},
      {"name":"Send Email Trigger Action","id":"trigger_action_send_email"},
      {"name":"Set Attribute Value","id":"trigger_action_set_attribute_value"},
      {"name":"Set Cookie","id":"trigger_action_set_cookie"},
      {"name":"Set Design","id":"trigger_action_set_design"},
      {"name":"Set Design Associated Files","id":"trigger_action_set_design_associated_files"},
      {"name":"Set Design Parse File","id":"trigger_action_set_design_parse_file"},
      {"name":"Set Force Secure","id":"trigger_action_set_force_secure"},
      {"name":"Set Future Lineage","id":"trigger_action_set_future_lineage"},
      {"name":"Set Future Permission","id":"trigger_action_set_future_permission"},
      {"name":"Set Future Status","id":"trigger_action_set_future_status"},
      {"name":"Set Index Page for site","id":"trigger_action_set_index_page"},
      {"name":"Set Metadata Field Date","id":"trigger_action_set_metadata_field_date"},
      {"name":"Set Metadata Schema","id":"trigger_action_set_metadata_schema"},
      {"name":"Set Metadata Value","id":"trigger_action_set_metadata_value"},
      {"name":"Set Paint Layout","id":"trigger_action_set_paint_layout"},
      {"name":"Set Permission","id":"trigger_action_set_permission"},
      {"name":"Set Role","id":"trigger_action_set_role"},
      {"name":"Set Session Var Trigger Action","id":"trigger_action_set_session_var"},
      {"name":"Set Site Special Page","id":"trigger_action_set_site_special_page"},
      {"name":"Set Standard Asset Date","id":"trigger_action_set_standard_asset_date"},
      {"name":"Set Status","id":"trigger_action_set_status"},
      {"name":"Set Tag","id":"trigger_action_set_tag"},
      {"name":"Set Thesaurus Term from XML","id":"trigger_action_set_thesaurus_terms"},
      {"name":"Set Thumbnail","id":"trigger_action_set_thumbnail"},
      {"name":"Set Workflow Schema","id":"trigger_action_set_workflow_schema"},
      {"name":"Update Link","id":"trigger_action_update_link"},
      {"name":"Update Twitter Status","id":"trigger_action_update_twitter_status"},
      {"name":"Urban Airship Push Notification","id":"trigger_action_urban_airship"},
      {"name":"Trigger Condition","id":"trigger_condition"},
      {"name":"Access Permission","id":"trigger_condition_access_permission"},
      {"name":"Asset ID","id":"trigger_condition_asset_id"},
      {"name":"Asset is tagged","id":"trigger_condition_asset_tagged"},
      {"name":"Asset is of type","id":"trigger_condition_asset_type"},
      {"name":"Attribute Changed","id":"trigger_condition_attribute_changed"},
      {"name":"Attribute Value","id":"trigger_condition_attribute_value"},
      {"name":"Keyword Value","id":"trigger_condition_keyword"},
      {"name":"Interface Mode","id":"trigger_condition_interface_mode"},
      {"name":"Has a Child / Parent","id":"trigger_condition_link_exists"},
      {"name":"Metadata Field Updated","id":"trigger_condition_metadata_field_updated"},
      {"name":"Metadata Set","id":"trigger_condition_metadata_set"},
      {"name":"Metadata Time","id":"trigger_condition_metadata_time"},
      {"name":"Metadata Value","id":"trigger_condition_metadata_value"},
      {"name":"Request Method","id":"trigger_condition_request_method"},
      {"name":"REST Response","id":"trigger_condition_rest_response"},
      {"name":"Asset Status","id":"trigger_condition_status"},
      {"name":"Asset Status Being Changed To","id":"trigger_condition_status_change_to"},
      {"name":"Tree Location","id":"trigger_condition_tree_location"},
      {"name":"URL matches","id":"trigger_condition_url_matches"},
      {"name":"Current user is a LDAP user","id":"trigger_condition_user_ldap"},
      {"name":"Current user is a public user","id":"trigger_condition_user_public"},
      {"name":"Current user is a system administrator","id":"trigger_condition_user_sysadmin"},
      {"name":"Trigger Event","id":"trigger_event"},
      {"name":"After Asset Built","id":"trigger_event_after_asset_built"},
      {"name":"After Asset Metadata Updated","id":"trigger_event_after_metadata_updated"},
      {"name":"Asset Accessed","id":"trigger_event_asset_accessed"},
      {"name":"Asset Cloned","id":"trigger_event_asset_cloned"},
      {"name":"Asset Content Changed","id":"trigger_event_asset_content_changed"},
      {"name":"Asset Created","id":"trigger_event_asset_created"},
      {"name":"Asset Recached","id":"trigger_event_asset_recached"},
      {"name":"Asset Updated","id":"trigger_event_asset_updated"},
      {"name":"Asset Attributes Changed","id":"trigger_event_attributes_changed"},
      {"name":"Asset Attributes Saved","id":"trigger_event_attributes_saved"},
      {"name":"Before Asset Created","id":"trigger_event_before_asset_created"},
      {"name":"Before Asset Deleted","id":"trigger_event_before_asset_deleted"},
      {"name":"Before Status Change","id":"trigger_event_before_status_change"},
      {"name":"Before User Logout","id":"trigger_event_before_user_logout"},
      {"name":"Counter Number Issued","id":"trigger_event_counter_number_issued"},
      {"name":"Order Submitted","id":"trigger_event_ecommerce_order_submitted"},
      {"name":"Payment Completed","id":"trigger_event_ecommerce_payment_completed"},
      {"name":"Simple Edit Accessed","id":"trigger_event_enter_simple_edit"},
      {"name":"Link Created","id":"trigger_event_link_created"},
      {"name":"Link Deleted","id":"trigger_event_link_deleted"},
      {"name":"Asset Lookups Updated","id":"trigger_event_lookups_updated"},
      {"name":"Matrix Cache Cleared","id":"trigger_event_matrix_cache_cleared"},
      {"name":"Metadata Time","id":"trigger_event_metadata_time"},
      {"name":"Asset Metadata Updated","id":"trigger_event_metadata_updated"},
      {"name":"Paypal IPN Completed","id":"trigger_event_paypal_ipn_completed"},
      {"name":"Public User Session Created","id":"trigger_event_public_user_session_created"},
      {"name":"REST Response Received","id":"trigger_event_rest_response_received"},
      {"name":"Status Changed","id":"trigger_event_status_changed"},
      {"name":"Asset Tagging Updated","id":"trigger_event_tagging_updated"},
      {"name":"User Login","id":"trigger_event_user_login"},
      {"name":"User Logout","id":"trigger_event_user_logout"},
      {"name":"After Workflow Approval","id":"trigger_event_workflow_approval"},
      {"name":"After Workflow Rejection","id":"trigger_event_workflow_rejection"},
      {"name":"Trigger Manager","id":"trigger_manager"},
      {"name":"TRIM Connector","id":"trim_connector"},
      {"name":"User","id":"user"},
      {"name":"Backend User","id":"backend_user"},
      {"name":"IPB User","id":"ipb_user"},
      {"name":"System Administrator","id":"system_user"},
      {"name":"Root User","id":"root_user"},
      {"name":"LDAP User","id":"ldap_user"},
      {"name":"LDAP Backend User","id":"ldap_backend_user"},
      {"name":"LDAP Simple Edit User","id":"ldap_simple_edit_user"},
      {"name":"Public Access User","id":"public_user"},
      {"name":"Simple Edit User","id":"simple_edit_user"},
      {"name":"Bundle","id":"workflow_bundle"},
      {"name":"Workflow Step Condition","id":"workflow_step_condition"},
      {"name":"Workflow Stream","id":"workflow_stream"},
      {"name":"XML User Bridge","id":"xml_user_bridge"}
  ];



  $scope.loadAssetsTypeCodes = [];

  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"simple_edit_user"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"ldap_simple_edit_user"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"ldap_user"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"root_user"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"system_user"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"ipb_user"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"backend_user"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"user"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"trigger"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"news_item"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"page_calendar_events_search"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"page_site_map"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"page_redirect"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"page_custom_form"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"page_calendar"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"page_whats_new"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"page_asset_listing"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"page"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"page_standard"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"page_asset_builder"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"search_list"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"search_page"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"comment"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"metadata_field"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"link"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"form_submission"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"form_question"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"form"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"workflow_schema"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"metadata_schema"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"workflow_step"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"folder"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"xsl_file"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"word_doc"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"flv_file"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"powerpoint_doc"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"pdf_file"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"mp3_file"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"js_file"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"image"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"excel_doc"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"css_file"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"file"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"design_css"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"design"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"data_record"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"paint_layout_page"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"calendar_event_multi_date"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"calendar_event_recurring"}));
  $scope.loadAssetsTypeCodes = $scope.loadAssetsTypeCodes.concat(_.where($scope.loadAssetsTypeCodesAll,{"id":"calendar_event_single"}));



  /*******************  2.4 jsAPI actions list  ********************/

  $scope.fieldsMetadata = [];//setMetadata action needs this array
  $scope.actionsList = [
      {
          "funcName": "createAsset",
          "assetVarName": null, //the attribute that will contain the table's assets' ids e.g. "asset_id" or "child_id" or "context_id" etc.
          "vars": [
              {
                  "required":true, //field must have a value
                  "requiredSet":true, //indicates that jsAPI requires this field to be set in batch request, even if it's "", can only be learnt from experience trying each function
                  "set":true, //field is set in batch request, if false, then will not show up in batch request
                  "name": "parent_id",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My parent id",
                  "note": "Parentid of the new parent"
              },
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "type_code",
                  "type": "select",
                  //"val": $scope.loadAssetsTypeCodes[305]['id'],
                  "val": null,
                  "csv": false,
                  "example": "My type code",
                  "note": "Type code of the new asset",
                  "ops": $scope.loadAssetsTypeCodes,
                  "opsKey": "id",
                  "opsName": "name"
              },
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "asset_name",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My asset name",
                  "note": "Name for the new asset"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "link_type",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "132435",
                  "note": "Type of link to create."
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "link_value",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "My link value",
                  "note": "Value of the link."
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "sort_order",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "132435",
                  "note": "Order in the tree"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "is_dependant",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "132435",
                  "note": "Dependant to parent"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "is_exclusive",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "132435",
                  "note": "Exclusive to parent"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "extra_attributes",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "132435",
                  "note": "Allows additional attributes"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "attributes",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My attributes",
                  "note": "String of additional query string containing key/pair values*"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Create Asset"
      },
      {
          "funcName": "createFileAsset",
          "assetVarName": null,
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "parentID",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "132435",
                  "note": "Parentid of the new parent"
              },
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "type_code",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My type code",
                  "note": "Type code of the new asset (defaults to 'File')"
              },
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "friendly_name",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My friendly name",
                  "note": "Name of the asset being created"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "link_type",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My link type",
                  "note": "Type of link to create for File asset (SQ_LINK_TYPE_1, SQ_LINK_TYPE_2, SQ_LINK_TYPE_3, or SQ_LINK_NOTICE)"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "link_value",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My link value",
                  "note": "Value of the link to create to parent for this new asset"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Create File Asset"
      },
      {
          "funcName": "cloneAsset",
          "assetVarName": "asset_id",
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "new_parent",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "132435",
                  "note": "Asset ID of the parent to clone under"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "clone_num",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "132435",
                  "note": "Number of clones to create."
              },
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "new_position",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "132435",
                  "note": "Position to place newly created assets under the parent."
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "link_type",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My link type",
                  "note": "Link type of the cloned asset (SQ_LINK_TYPE_1, SQ_LINK_TYPE_2, SQ_LINK_TYPE_3, or SQ_LINK_NOTICE)"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "link_value",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My link value",
                  "note": "Link value of the cloned asset"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Clone Asset"
      },
      {
          "funcName": "getGeneral",
          "assetVarName": "asset_id",
          "vars": [
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "get_attributes",
                  "type": "boolean",
                  "val": "0",
                  "csv": false,
                  "example": "",
                  "note": "If we are getting non standard attribute values of the assets (FALSE by default)"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Get General"
      },
      {
          "funcName": "getChildCount",
          "assetVarName": "asset_id",
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "level",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "",
                  "note": "Number of levels to return, default all"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Get Child Count"
      },
      {
          "funcName": "getAssetTypes",
          "assetVarName": null,
          "vars": [],
          "disabled": false,
          "blocking": false,
          "name": "Get Asset Types"
      },
      {
          "funcName": "getAttributes",
          "assetVarName": "asset_id",
          "vars": [],
          "disabled": false,
          "blocking": false,
          "name": "Get Attributes"
      },
      {
          "funcName": "setAttribute",
          "assetVarName": "asset_id",
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "attr_name",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My attr name",
                  "note": "Name of the attribute to change"
              },
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "attr_val",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My attr val",
                  "note": "Value to change the attribute to"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Set Attribute"
      },
      {
          "funcName": "setMultipleAttributes",
          "assetVarName": "asset_id",
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "field_info (attr_name, attr_val)",
                  "type": "array",
                  "val": "",
                  "csv": false,
                  "example": "",
                  "note": "Attribute name and their respect value"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Set Multiple Attributes"
      },
      {
          "funcName": "getLocksInfo",
          "assetVarName": "asset_id",
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "screen_name",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My screen name",
                  "note": "The screen to get locks for"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Get Locks Info"
      },
      {
          "funcName": "acquireLock",
          "assetVarName": "asset_id",
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "screen_name",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My screen name",
                  "note": "The screen to get locks for"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "dependants_only",
                  "type": "boolean",
                  "val": "0",
                  "csv": false,
                  "example": "",
                  "note": "whether dependants only or all children, defaults to true"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "force_acquire",
                  "type": "boolean",
                  "val": "0",
                  "csv": false,
                  "example": "",
                  "note": "whether to attempt to forcibly acquire the lock of not, defaults to false"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Acquire Lock"
      },
      {
          "funcName": "releaseLock",
          "assetVarName": "asset_id",
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "screen_name",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My screen name",
                  "note": "The screen to release locks for"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Release Lock"
      },
      {
          "funcName": "trashAsset",
          "assetVarName": null,
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "asset_ids",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "",
                  "note": "Id of the asset(s) to delete"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Trash Asset"
      },
      {
          "funcName": "getKeywordsReplacements",
          "assetVarName": "asset_id",
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "keywords_array",
                  "type": "array",
                  "val": "",
                  "csv": false,
                  "example": "",
                  "note": "Array of keywords to get replacements for"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Get Keywords Replacements"
      },
      {
          "funcName": "setAssetStatus",
          "assetVarName": "asset_id",
          "vars": [
              {
                  "required":true,
                  "requiredSet":false,
                  "set":true,
                  "name": "status",
                  "type": "select",
                  //"val": $scope.matrixAssetStatuses[8]['id'],
                  "val": null,
                  "csv": false,
                  "example": "",
                  "note": "The status the asset is to be set to",
                  "ops": $scope.matrixAssetStatuses,
                  "opsKey": "id",
                  "opsName": "name"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "cascade",
                  "type": "boolean",
                  "val": "0",
                  "csv": false,
                  "example": "",
                  "note": "If to cascade the status to non-dependant children (false by default)"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "workflow_stream",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My workflow stream",
                  "note": "Workflow stream to be passed in"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Set Asset Status"
      },
      {
          "funcName": "getWebPath",
          "assetVarName": "asset_id",
          "vars": [],
          "disabled": false,
          "blocking": false,
          "name": "Get Web Path"
      },
      {
          "funcName": "setWebPath",
          "assetVarName": "asset_id",
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "paths",
                  "type": "array",
                  "val": "",
                  "csv": false,
                  "example": "",
                  "note": "New web paths to be assigned to asset"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "auto_remap",
                  "type": "boolean",
                  "val": "0",
                  "csv": false,
                  "example": "",
                  "note": "If to auto-remap (default to True)"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Set Web Path"
      },
      {
          "funcName": "getRoles",
          "assetVarName": "asset_id",
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "role_id",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "132435",
                  "note": "The assetid of the roles that is applied"
              },
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "user_id",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "132435",
                  "note": "The assteid of the user performing the role"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "include_assetid",
                  "type": "boolean",
                  "val": "0",
                  "csv": false,
                  "example": "",
                  "note": "Whether to include the assetid in the returned array"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "include_globals",
                  "type": "boolean",
                  "val": "0",
                  "csv": false,
                  "example": "",
                  "note": "Whether to query the role view which includes expanded Global roles as individual users"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "expand_groups",
                  "type": "boolean",
                  "val": "0",
                  "csv": false,
                  "example": "",
                  "note": "When TRUE, any groups defined within a role will be replaced with the userids in that group; If FALSE, return the groupids"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "inc_dependants",
                  "type": "boolean",
                  "val": "0",
                  "csv": false,
                  "example": "",
                  "note": "If FALSE, filter out dependant assets"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "include_parents",
                  "type": "boolean",
                  "val": "0",
                  "csv": false,
                  "example": "",
                  "note": "When userid is specified; this will return role information for roles that a user has inherited from its parent groups, as well as those directly applied on the user."
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "type_codes",
                  "type": "array",
                  "val": "",
                  "csv": false,
                  "example": "",
                  "note": "When include_assetid is TRUE; filter the returned asset IDs by a specified type code."
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "strict_type_code",
                  "type": "boolean",
                  "val": "0",
                  "csv": false,
                  "example": "",
                  "note": "Whether to use strict type code for type code filter, i.e. type codes not inherited."
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Get Roles"
      },
      {
          "funcName": "setContentOfEditableFileAsset",
          "assetVarName": "asset_id",
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "content",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My content",
                  "note": "New content of the asset"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Set Content Of Editable File Asset"
      },
      {
          "funcName": "importAssetsFromXML",
          "assetVarName": "asset_id",
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "filepath",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My filepath",
                  "note": "Path to file on the file system"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Import Assets From XML"
      },
      {
          "funcName": "executeHTMLTidy",
          "assetVarName": null,
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "content",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My content",
                  "note": "String content to be cleaned up"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Execute HTML Tidy"
      },
      {
          "funcName": "showDifference",
          "assetVarName": null,
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "assetid_1",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "132435",
                  "note": "Asset ID of the first asset to compare"
              },
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "assetid_2",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "132435",
                  "note": "Asset ID of the second asse to compare"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "paint_layout_1",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "132435",
                  "note": "Asset ID of the Paint Layout to apply to Asset 1"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "paint_layout_2",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "132435",
                  "note": "Asset ID of the Paint Layout to apply to Asset 2"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Show Difference"
      },
      {
          "funcName": "createLink",
          "assetVarName": "child_id",
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "parent_id",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "132435",
                  "note": "Major asset id we are linking"
              },
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "link_type",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "132435",
                  "note": "Type of link to create"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "link_value",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My link value",
                  "note": "Value of the link"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "sort_order",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "132435",
                  "note": "Order in the tree"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "is_dependant",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "132435",
                  "note": "Dependant to parent"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "is_exclusive",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "132435",
                  "note": "Exclusive to parent"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Create Link"
      },
      {
          "funcName": "removeLink",
          "assetVarName": "child_id",
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "parent_id",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "132435",
                  "note": "Id of the parent"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "link_type",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My link type",
                  "note": "Type of link we are looking for (SQ_LINK_TYPE_1, SQ_LINK_TYPE_2, SQ_LINK_TYPE_3, or SQ_LINK_NOTICE)"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "link_value",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My link value",
                  "note": "Value of link we are looking for ('' by default)"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Remove Link"
      },
      {
          "funcName": "removeMultipleLinks",
          "assetVarName": "asset_id",
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "link_info",
                  "type": "json object",
                  "val": "",
                  "csv": false,
                  "example": "",
                  "note": "Array of link_info (parent, child, link_type, link_value)"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Remove Multiple Links"
      },
      {
          "funcName": "moveLink",
          "assetVarName": "child_id",
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "old_parent_id",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "132435",
                  "note": "Id of the old parent"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "old_link_type",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My old link_type",
                  "note": "Type of link we are search for between given assets (SQ_LINK_TYPE_1, SQ_LINK_TYPE_2, SQ_LINK_TYPE_3, or SQ_LINK_NOTICE)"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "old_link_value",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My old link_value",
                  "note": "Value of link we are searching for between given assets ('' by default)"
              },
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "new_parent_id",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "132435",
                  "note": "Id of the new parent"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "new_link_type",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My new link_type",
                  "note": "Type of link to use (SQ_LINK_TYPE_1, SQ_LINK_TYPE_2, SQ_LINK_TYPE_3, or SQ_LINK_NOTICE)"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "new_link_value",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My new link value",
                  "note": "Value of link to use ('' by default)"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "new_position",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My new position",
                  "note": "The new position"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Move Link"
      },
      {

          /* Made locked field required and set to 0 automatically because otherwise its set to 1 by default :S */
          "funcName": "updateLink",
          "assetVarName": "child_id",
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "parent_id",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "132435",
                  "note": "Id of the parent"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "existing_link_type",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "SQ_LINK_TYPE_1",
                  "note": "Existing link type"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "existing_link_value",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My existing link_value",
                  "note": "Existing link val"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "link_type",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "SQ_LINK_TYPE_2",
                  "note": "Link type to set"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "link_value",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My link value",
                  "note": "Link val to set"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "sort_order",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My sort order",
                  "note": "The new position"
              },
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "locked",
                  "type": "string",
                  "val": "0",
                  "csv": false,
                  "example": "0",
                  "note": "Link lock status"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Update Link"
      },
      {
          "funcName": "updateMultipleLinks",
          "assetVarName": "asset_id",
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "link_info",
                  "type": "json object",
                  "val": "",
                  "csv": false,
                  "example": "",
                  "note": "Array of link_info (parent, child, link_type, link_value)"
              }
          ],
          "disabled": true,
          "blocking": false,
          "name": "Update Multiple Links"
      },
      {
          "funcName": "getLinkId",
          "assetVarName": "child_id",
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "parent_id",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "132435",
                  "note": "Id of the parent"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "link_type",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My link type",
                  "note": "Type of link we are looking for (SQ_LINK_TYPE_1, SQ_LINK_TYPE_2, SQ_LINK_TYPE_3, or SQ_LINK_NOTICE)"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "link_value",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My link value",
                  "note": "Value of link we are looking for ('' by default)"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "all_info",
                  "type": "boolean",
                  "val": "0",
                  "csv": false,
                  "example": "",
                  "note": "If we want all the link information or just linkid"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Get Link Id"
      },
      {
          "funcName": "getPermissions",
          "assetVarName": "asset_id",
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "level",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "132435",
                  "note": "Permission level: 1=READ 2=WRITE 3=ADMIN"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Get Permissions"
      },
      {
          "funcName": "getWorkflowSchema",
          "assetVarName": "asset_id",
          "vars": [
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "granted",
                  "type": "boolean",
                  "val": "0",
                  "csv": false,
                  "example": "",
                  "note": "What is the status of workflow we are trying to get (default to Null)"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "running",
                  "type": "boolean",
                  "val": "0",
                  "csv": false,
                  "example": "",
                  "note": "True = granted  False = denied Null = get all"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Get Workflow Schema"
      },
      {
          "funcName": "getParents",
          "assetVarName": "asset_id",
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "levels",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "",
                  "note": "Number of levels to return"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "type_codes",
                  "type": "array",
                  "val": "",
                  "csv": false,
                  "example": "",
                  "note": "Asset type code that we want back"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "link_types",
                  "type": "array",
                  "val": "",
                  "csv": false,
                  "example": "",
                  "note": "Link type of links we are looking for (SQ_LINK_TYPE_1, SQ_LINK_TYPE_2, SQ_LINK_TYPE_3, or SQ_LINK_NOTICE)"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "link_values",
                  "type": "array",
                  "val": "",
                  "csv": false,
                  "example": "",
                  "note": "Link values allowed on the asset returned"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "get_attributes",
                  "type": "boolean",
                  "val": "0",
                  "csv": false,
                  "example": "",
                  "note": "If we are getting non standard attribute values of the assets (FALSE by default)"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Get Parents"
      },
      {
          "funcName": "getChildren",
          "assetVarName": "asset_id",
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "levels",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "",
                  "note": "Number of levels to return"
              },
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "type_codes",
                  "type": "array",
                  "val": "",
                  "csv": false,
                  "example": "",
                  "note": "Asset type code that we want back"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "link_types",
                  "type": "array",
                  "val": "",
                  "csv": false,
                  "example": "",
                  "note": "Link type of links we are looking for (SQ_LINK_TYPE_1, SQ_LINK_TYPE_2, SQ_LINK_TYPE_3, or SQ_LINK_NOTICE)"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "link_values",
                  "type": "array",
                  "val": "",
                  "csv": false,
                  "example": "",
                  "note": "Link values allowed on the asset returned"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "get_attributes",
                  "type": "boolean",
                  "val": "0",
                  "csv": false,
                  "example": "",
                  "note": "If we are getting non standard attribute values of the assets (FALSE by default)"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Get Children"
      },
      {
          "funcName": "getAssetTree",
          "assetVarName": "asset_id",
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "levels",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "132435",
                  "note": "Number of levels to return"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Get Asset Tree"
      },
      {
          "funcName": "getLineage",
          "assetVarName": null,
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "asset_url",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My/asset/url",
                  "note": "URL or asset ID of the asset to get the lineage of"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "significant_link_only",
                  "type": "boolean",
                  "val": "0",
                  "csv": false,
                  "example": "",
                  "note": "If to return significant links only (TYPE 1 and TYPE 2 links)"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Get Lineage"
      },
      {
          "funcName": "getLineageFromUrl",
          "assetVarName": null,
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "asset_url",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My/asset/url",
                  "note": "URL of the asset to get the lineage of"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Get Lineage From Url"
      },
      {
          "funcName": "getUrlFromLineage",
          "assetVarName": null,
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "lineage",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My lineage",
                  "note": "An array of asset IDs in lineage order, e.g. [\"80\",\"85\",\"200\"] or [{\"assetid\":\"80\"},{\"assetid\":\"85\"}]"
              },
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "root_url",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My root url",
                  "note": "A root URL to filter the results against multiple roots"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "protocol",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My protocol",
                  "note": "A protocol to filter the results, e.g. http, https"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Get Url From Lineage"
      },
      {
          "funcName": "getMetadata",
          "assetVarName": "asset_id",
          "vars": [],
          "disabled": false,
          "blocking": false,
          "name": "Get Metadata"
      },
      {
          "funcName": "setMetadata",
          "assetVarName": "asset_id",
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "field_id",
                  "type": "select",
                  "val": null,
                  "csv": false,
                  "example": "125",
                  "note": "Id of the metadata field we are setting info for",
                  "ops": $scope.fieldsMetadata,
                  "opsKey": "meta_id",
                  "opsName": "name"

              },
              {
                  "required":false,
                  "requiredSet":true,
                  "set":true,
                  "name": "field_val",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My field val",
                  "note": "The value set as metadata*"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Set Metadata"
      },
      {
          "funcName": "setMetadataAllFields",
          "assetVarName": "asset_id",
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "field_info",
                  "type": "array",
                  "val": "",
                  "csv": false,
                  "example": "",
                  "note": "Field Ids and their values"
              }
          ],
          "disabled": true,
          "blocking": false,
          "name": "Set Metadata All Fields"
      },
      {
          "funcName": "getMetadataSchema",
          "assetVarName": "asset_id",
          "vars": [
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "granted",
                  "type": "boolean",
                  "val": "0",
                  "csv": false,
                  "example": "",
                  "note": "If to return metadata schemas that have been applied (TRUE) or denied (FALSE)"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "cascades",
                  "type": "boolean",
                  "val": "0",
                  "csv": false,
                  "example": "",
                  "note": "If to return metadata schemas that cascade to newly created child assets (TRUE) or schemas that do not (FALSE)"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Get Metadata Schema"
      },
      {
          "funcName": "editMetadataSchema",
          "assetVarName": "asset_id",
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "assetid",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My assetid",
                  "note": "The asset to set/unset the metadata schema on"
              },
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "schemaid",
                  "type": "string",
                  "val": "",
                  "csv": false,
                  "example": "My schemaid",
                  "note": "The metadata schema to be set/unset on the asset"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "set",
                  "type": "boolean",
                  "val": "0",
                  "csv": false,
                  "example": "",
                  "note": "Whether the metadata schema is being set (1) or unset (0)"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "granted",
                  "type": "boolean",
                  "val": "0",
                  "csv": false,
                  "example": "",
                  "note": "whether the metadata schema is being applied (TRUE) or denied (FALSE)"
              },
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "cascades",
                  "type": "boolean",
                  "val": "0",
                  "csv": false,
                  "example": "",
                  "note": "whether or not the schema should be cascaded to newly created assets"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Edit Metadata Schema"
      },
      {
          "funcName": "getAlternateContext",
          "assetVarName": null,
          "vars": [
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "all_info",
                  "type": "boolean",
                  "val": "0",
                  "csv": false,
                  "example": "",
                  "note": "If to return all information of returned contexts"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Get Alternate Context"
      },
      {
          "funcName": "getCurrentContext",
          "assetVarName": null,
          "vars": [
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "all_info",
                  "type": "boolean",
                  "val": "0",
                  "csv": false,
                  "example": "",
                  "note": "If to return all information of returned contexts"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Get Current Context"
      },
      {
          "funcName": "getAllContexts",
          "assetVarName": null,
          "vars": [
              {
                  "required":false,
                  "requiredSet":false,
                  "set":false,
                  "name": "all_info",
                  "type": "boolean",
                  "val": "0",
                  "csv": false,
                  "example": "",
                  "note": "If to return all information of returned contexts"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Get All Contexts"
      },
      {
          "funcName": "setContext",
          "assetVarName": "context_id",
          "vars": [
              {
                  "required":true,
                  "requiredSet":true,
                  "set":true,
                  "name": "context_id",
                  "type": "integer",
                  "val": "",
                  "csv": false,
                  "example": "132435",
                  "note": "Id of the context you want to activate"
              }
          ],
          "disabled": false,
          "blocking": false,
          "name": "Set Context"
      },
      {
          "funcName": "restoreContext",
          "assetVarName": null,
          "vars": [],
          "disabled": false,
          "blocking": false,
          "name": "Restore Context"
      }
  ];



  /*****************************************************************/
  /*****************************************************************/
  /*****************************************************************/
  /********************  3. Helper functions  **********************/
  /*****************************************************************/
  /*****************************************************************/
  /*****************************************************************/


  /*********************  3.1 convertCsvToArray  **********************/

  $scope.convertCsvToArray = function(csv,divider) {
    var array = [];
    var rows = csv.split('\n');//split csv up into rows
    _.each(rows,function(rowStr) {
      var rowArray = [];
      var row = rowStr.replace(/^\s+|\s+$/g,'');
      if(row !== '') {
        rowArray = rowStr.split(divider);
        array.push(rowArray);
      }
    });
    return array;  
  };


  /*********************  3.2 checkValidCsv  **********************/

  $scope.checkValidCsv = function(csv,divider,errorCallback,successCallback) {
    var errors = '';
    var csvArray = $scope.convertCsvToArray(csv,divider);
    var rowStrings = csv.split('\n');//split csv up into rows
    var topRowLength = 0;

    if(!csvArray[0]) {errors += 'Nothing in csv\n'; errorCallback(errors);}

    topRowLength = csvArray[0].length;
    
    _.each(csvArray,function(row,$index) {
      if(row.length !== topRowLength) errors += 'Row ' + ($index+1) + ' has ' + row.length + ' items:           ' + rowStrings[$index] + '\n';
    });

    if(errors !== '') {errors = 'Each row should have ' + topRowLength + ' items\n\n' + errors;}


    if(errors !== '') {
      errorCallback(errors);
    }else{
      successCallback();
    }
  };


  /*********************  3.3 prettifyName  **********************/

  $scope.prettifyName = function(string) {
    var newString = string.replace(/_/g,' ');
    newString = newString.charAt(0).toUpperCase() + newString.slice(1);
    return newString;
  };



  /*********************  3.4 divideArray  **********************/

  $scope.divideArray = function(array) {
    var newArray = _.clone(array);
    var arrayOfArrays = [];

    var divSize = 0;

    if($scope.chunkType === 'manual') {
      divSize = Number($scope.chunkManualAmount);
    }else{
      divSize = Math.floor(newArray.length / $scope.chunkFlexibleDivisionAmount);
      var min = Number($scope.chunkFlexibleMin);
      var max = Number($scope.chunkFlexibleMax);
      if(divSize > max) divSize = max;
      if(divSize < min) divSize = min;
    }

    for(var a = 0;newArray.length > divSize;a++) {//while assetIds is more than chunk size, keep splicing
      arrayOfArrays.push(newArray.splice(0,divSize));
    }
    if(newArray.length) {arrayOfArrays.push(newArray);}//if theres any left in assetIds, push that also
    return arrayOfArrays;
  };


  /*********************  3.5 removeFromArray  **********************/

  $scope.removeFromArray = function(array,item) {
    var index = array.indexOf(item);
    array.splice(index, 1);
  };


  /*********************  3.6 executeBatchFunctions  **********************/

  $scope.executeBatchFunctions = function(batchFunctions,callBack) {

    var batchFunctionsChunked = [];

    if(batchFunctions instanceof Array) {//check for old technique where chunked functions came in so it doesn't 
      batchFunctionsChunked = batchFunctions;
    }else{
      batchFunctionsChunked = $scope.batchFunctionsConvertToChunked(batchFunctions);
    }


    var totalBatchFunctions = Object.keys(batchFunctions).length;// just need the total number for loader 
    var noOfChunks = batchFunctionsChunked.length;
    var functions = [];
    var allResults = [];//concat all chunks' results to this array to diplay after

    var totalExecuted = 0;

    //if it's just one function (like getChildren), they're just gonna have to wait! So just show a full progress bar
    if(totalBatchFunctions === 1 && $scope.loaderOne.current === 0) {
      $scope.loaderOne.showing = false;
      $scope.loaderTwo.current = 1;
      $scope.loaderTwo.total = 1;
    }else{
      $scope.loaderOne.showing = true;
    }

    for (var c in batchFunctionsChunked) {
      if(batchFunctionsChunked.hasOwnProperty(c)) {

        var newFunction = function(position) {
            jspAPIService.executeBatch(batchFunctionsChunked[position],function(results) {
              allResults = allResults.concat(results);//add results to array
              if(position === noOfChunks - 1) {
                callBack(allResults);//finished, do call back
              }else{
                functions[position+1](position+1);// call next function
              }
              totalExecuted += Object.keys(batchFunctionsChunked[position]).length;
              $scope.loaderUpdate($scope.loaderTwo,totalBatchFunctions,totalExecuted);
            });
        };//end newFunction object

        functions.push(newFunction);
      }
    }

    functions[0](0);//start executing
  };

  /*********************  3.7 Chunk Batch Functions  **********************/

  $scope.batchFunctionsConvertToChunked = function(batchFunctions) {

      var chunkSize = 0;
      if($scope.chunkType === 'manual') {
        chunkSize = Number($scope.chunkManualAmount);
      }else{
        chunkSize = Math.floor(Object.keys(batchFunctions).length / $scope.chunkFlexibleDivisionAmount);
        var min = Number($scope.chunkFlexibleMin);
        var max = Number($scope.chunkFlexibleMax);
        if(chunkSize > max) chunkSize = max;
        if(chunkSize < min) chunkSize = min;
      }


      var batchFunctionsChunked = [];
      var newChunk = {};
      var counter = 0;
      _.each(batchFunctions,function(func,$index) {
        newChunk[String(counter)] = func;
        if(Object.keys(newChunk).length === chunkSize) {
          batchFunctionsChunked.push(_.clone(newChunk));
          newChunk = {};
          counter = 0;
        } else {
          counter ++;
        }
      });
      if(Object.keys(newChunk).length > 0) {//if the last one has some functions push it
        batchFunctionsChunked.push(_.clone(newChunk));
      }

      return batchFunctionsChunked;
  };




/****************** 3.8 Keywords replacement  **************/


  $scope.keywordModifiers = {
    "replace":{
      "varsRequired":2,
      "func":function(string,varsArray) {
        /*
          CHARACTER REPLACE
            %{MY FIELD}^replace:{CHAR TO REPLACE}:{CHAR TO REPLACE WITH}%
            - %replace:-: %   John-Smith --> John Smith
            - %replace:John:JOHN%   John-Smith --> JOHN-Smith
        */

        return string.replace(new RegExp(varsArray[0],"g"),varsArray[1]);
      }
    }
  };

  $scope.keywordsSpecial = {
    "randomnumber":{
      "varsRequired":3,
      "func":function(varsArray) {

        /*
          RANDOM NUMBER GENERATOR to use in 
            %randomnumber:{MAX}:{MIN}:{FORMAT}%
            - %randomnumber:2:4:dd%      03 02 04
            - %randomnumber:1:100:ddd%   001 009 003 100 099
            - %randomnumber:1:28:d%      1 27 13 9 28 2        
        */

        var intFrom = Number(varsArray[0]); // 5
        var intTo = Number(varsArray[1]); // 9
        var intFormat = varsArray[2]; // 'ddd' 

        var randomNo = String(Math.floor(Math.random() * (intTo-intFrom+1)) + intFrom);
        if(randomNo.length < intFormat.length) {
          var zerosToAdd = intFormat.length - randomNo.length;
          for(var x=0;x<zerosToAdd;x++) {
            randomNo = '0' + randomNo;
          }
        }

        return randomNo;
      }
    }
  };

  $scope.keywordsReplace = function(stringVal,assetId,counter) {
    var spliceStr = function(str, index, count, add) {
      return str.slice(0, index) + add + str.slice(index + count);
    };

    //replace index if it's in there
    stringVal = stringVal.replace(/%index%/g,String(counter+1));


    var keywords = [];
    //var noOfKeywordChars = stringVal.split("str").length - 1;



      if(stringVal.indexOf('%') !== -1) {

        if((stringVal.split('%').length -1) % 2 === 0) {//check theres an even amount of %s

          //find any occurrances of the data field names in the 
          var asset = _.where($scope.assets,{"id":Number(assetId)})[0];

          //iterate through keywords ('.' in regexp means any char but a newline)
          var patt=/%[^% ]+%/g;
          var match = patt.exec(stringVal);

          while (match) {
            var keywordStartIndex = match.index;
            var keywordString = match[0]; //--> %name^replace: :_^replace:Jhon:John%
            var keywordStringLength = keywordString.length; //--> %name^replace: :_^replace:Jhon:John%

            keywordString = keywordString.replace(/%/g,'');// remove first and last % --> name^replace: :_^replace:Jhon:John

            var keywordSplit = keywordString.split('^'); // --> ['name','replace: :_','replace:Jhon:John']
            var keywordMods = keywordSplit.splice(1); // --> ['replace: :_','replace:Jhon:John']
            var keyword = keywordSplit[0]; // --> 'name' or randomnumber:1:28:ddd

            var value = '';
            _.each($scope.fields,function(field) {
              if(field.isMetadata) {
                if(keyword === field.meta_id) {
                  value = asset[field.id];
                }
              }else{
                if(keyword === field.id) {
                  value = asset[field.id];
                }
              }
            });// value --> 'Jhon Smith'

            //SPECIAL KEYWORDS      e.g. 'randomnumber:1:28:ddd'
            if(value === '') {//if no value is set from the fields then check special keywords
              var specialKeywordSplit = keyword.split(':');
              var specialKeywordVars = specialKeywordSplit.splice(1); // --> ['replace: :_','replace:Jhon:John']
              var specialKeyword = specialKeywordSplit[0]; // --> 'name' or randomnumber:1:28:ddd

              if($scope.keywordsSpecial[specialKeyword]) {
                value = $scope.keywordsSpecial[specialKeyword].func(specialKeywordVars);
              }
            }

            //now we're ready to do our modifiers

            //MODIFIERS     e.g. 'replace:Jhon:John'
            //only modify if theres something in the value and there's some modifiers
            if(value !== '' && keywordMods.length > 0) {
              _.each(keywordMods,function(modifierString) {
                //modifierString --> replace: :_
                var modifierSplit = modifierString.split(':'); // --> ['replace',' ','_']
                var modifierVars = modifierSplit.splice(1); // --> [' ','_']
                var modifier = modifierSplit[0]; // --> 'replace'

                if($scope.keywordModifiers[modifier] && $scope.keywordModifiers[modifier].varsRequired === modifierVars.length) {//if this modifier exists and it has the right number of vars then do it!
                  value = $scope.keywordModifiers[modifier].func(value,modifierVars);
                }
              });
            }

            //splice that part of the string out
            stringVal = spliceStr(stringVal, keywordStartIndex, keywordStringLength, value);

            patt=/%[^% ]+%/g;//need a new instance of patt, otherwise exec would cycle through :S
            match = patt.exec(stringVal);//reset matches as the chars have moved around
          }//end iterate through keywords



        }//end odd no of % check

      }//end check % present




    return stringVal;
  };



  /*****************************************************************/
  /*****************************************************************/
  /*****************************************************************/
  /**********************  4. User Interface  **********************/
  /*****************************************************************/
  /*****************************************************************/
  /*****************************************************************/


  /*****************************************************************/
  /**********************  4.1 Loading overlay  *********************/
  /*****************************************************************/


  $scope.loading = false;
  $scope.loadingText = '';

  $scope.loaderOne = {showing:true,text:'',total:0,current:0};
  $scope.loaderTwo = {showing:true,text:'',total:0,current:0};

  $scope.loadingStart = function(text) {//number of processes is usually 2/3/4, setMetadata, getGeneral, getMetadata,
    if($scope.loading) {
      //it's already loading so go to the next
      $scope.loaderOne.current++;//moving to next large function e.g. now setting metadata
    }else{
      //starting a new load
      $scope.loading = true;
      $scope.loaderOne.current = 0;
    }

    $scope.loaderTwo.progress = 0;// reset this every time a new function starts

    if(text) {
      $scope.loadingText = text;
      $scope.loaderOne.text = text;
    }else{
      $scope.loadingText = 'Loading...';
      $scope.loaderOne.text = 'Loading...';
    }

  };

  $scope.loaderUpdate = function(loader,total,current) {
    loader.total = total;
    loader.current = current;
    loader.text = current + " of " + total;
  };


/*****************************************************************/
/********************  4.2 Selected Assets  **********************/
/*****************************************************************/


  $scope.assets = [];
  $scope.assetsSelected = [];

  $scope.removeSelectedAssetsFromList = function() {
    var assetsToRemove = $scope.assetsSelected;
    _.each(assetsToRemove,function(asset) {
      $scope.removeFromArray($scope.assets,asset);
    });
    $scope.assetsSelected = [];
    $scope.searchChanged();//just to update search, in case you delete all the ones you searched for
    $scope.csvChangeAssetsLoaded = false;//for the bulk csv change, makes sure you need to reload your assets
  };

  $scope.refreshSelectedAssets = function() {
    //if there are selected assets then, reload their data
    if($scope.assetsSelected.length) {
      var assetsSelectedIds = [];
      _.each($scope.assetsSelected,function(asset) {
        assetsSelectedIds.push(asset.id);
      });
      $scope.getData({"assetIds":assetsSelectedIds});
    }else{
      $scope.message('error-true','No assets selected',"Please select some assets in the table to refresh.");
    }
  };

  $scope.reverseSelectedAssets = function() {
    if($scope.assetsSelected.length) {
      _.each($scope.assets,function(asset) {
        asset.selected = !asset.selected;
      });
      $scope.selectChanged();
    }
  };

  $scope.selectAll = false;
  $scope.selectAllChanged = function() {
    var assets = null;
    if($scope.searchTxt !== '') {
      assets = $scope.searchedAssets;
    }else{
      assets = $scope.assets;
    }
    _.each(assets,function(asset) {
      asset.selected = $scope.selectAll;
    });
    $scope.selectChanged();
  };

  $scope.selectChanged = function() {
    $scope.assetsSelected = _.filter($scope.assets,function(asset) {
      return asset.selected === true;
    });
    if($scope.cpanel.tabStatuses[3] === 'active') {
      $scope.csvSelectedRadio = 'selected';
    }
    $scope.executeSelectedRadio = 'selected';
  };


  $scope.getSelectedAssets = function() {
    return _.filter($scope.assets,function(asset) {
      return asset.selected === true;
    });
  };


/*****************************************************************/
/*********************  4.3 Control Panel Tabs *******************/
/*****************************************************************/


  $scope.cpanel = {
    "showing":true,
    "tabStatuses":['',true,false,false,false,false],//ignore the '', its there to have the indexes as 1234 instead of 0123
    "innerTabStatuses":['',
      ['',false,true,false],//tab 1
      ['',true,false],//tab 2
      ['',true,false],//tab 3
      ['',false,true],//tab 4
      ['',false,true]//tab 5
    ],
    "changeTab":function(tab,innerTab) {
      for(var t=1;t<this.tabStatuses.length;t++) {//disable all top level tabs
        this.tabStatuses[t] = false;
      }
      this.tabStatuses[tab] = true; //enable selected tab

      if(innerTab) {//if value is set for inner tab
        for(var i=1;i<this.innerTabStatuses[tab].length;i++) { //disable
          this.innerTabStatuses[tab][i] = false;
        }
        this.innerTabStatuses[tab][innerTab] = true;
      }

      this.showing = true;
    },
    "showHide":function() {this.showing = !this.showing;}
  };

/*****************************************************************/
/*********************  4.4 RHC functions  ***********************/
/*****************************************************************/

/************************  4.4.1 Search  *************************/

  $scope.searchTxt = '';
  $scope.search = {};//the object we pass into the filter

  $scope.searchField = '$';
  $scope.searchedAssets = '';

  $scope.searchBtnClear = function() {
    $scope.searchTxt = '';
    $scope.searchChanged();
  };

  $scope.searchChanged = function() {
    $scope.search[$scope.searchField] = $scope.searchTxt;
    $scope.searchedAssets = $filter('filter')($scope.assets,$scope.search);
  };
  $scope.searchFieldChanged = function() {
    $scope.searchClear();
    $scope.searchChanged();
  };

  $scope.searchClear = function() {
    //remove all search attributes
    for(var key in $scope.search) {
      if($scope.search.hasOwnProperty(key)) {
        delete($scope.search[key]);
      }
    }
  };


/*********************  4.4.2 Display Fields *********************/

  $scope.fields = [{"id":"id","name":"Id"}];
  //$scope.fieldsMetadata = []; initialised up before the actions
  $scope.fieldsDisplay = [];


/*************************  4.4.3 Sorting ************************/
  

  $scope.sort = {
    initialised:false,
    array:["-id"], //e.g. ['type','-name','id']       initialized later
    fields:[$scope.fields[0]], //array of field objects          initialized later
    directions:[true], //e.g. [false,true,false]
    reverse:false,
    newSortBy:function(field) {
      //for when column name is clicked
      if(this.fields.length === 1 && this.fields[0] === field) {//if already sorting by only this field then reverse
        this.directions[0] = !this.directions[0];
        this.changed(0);
      }else{
        this.fields = [field];
        this.directions = [false];
        this.array = [];
        this.changed(0);
      }
    },
    changed:function(index) {
      //new
      if(typeof this.directions[index] === 'undefined') {this.directions[index] = false;}
      var arraySortString = '';
      if(this.directions[index]) {arraySortString += '-';}//if true then give it a - to reverse it
      arraySortString += this.fields[index].id;//have now made the sort string e.g. "-id"

      this.array[index] = arraySortString;
    },
    remove:function(index) {
      this.array.splice(index,1);
      this.fields.splice(index,1);
      this.directions.splice(index,1);
    }
  };

/**********************  4.4.4 Pretty Dates **********************/

  $scope.prettyDates = true;
  $scope.prettyDatesManual = false;
  $scope.prettyDateFormat = "Do MMM 'YY";













/*****************************************************************/
/*****************************************************************/
/*****************************************************************/
/**********************  5 Get Data Functions ********************/
/*****************************************************************/
/*****************************************************************/
/*****************************************************************/
/*
PURPOSE
- Receives a number of asset ids
- Gets all the children (if selected)
- Gets general info and metadata for those assets
- Loads it into the asset table
*/

/*****************************************************************/
/**************************  5.1 Vars  *************************/
/*****************************************************************/


    $scope.loadType = 'ids';
    $scope.loadAssetIdsString = "4044";
    $scope.loadAssetIds = [];

    $scope.loadAssetStepOneResultAssets = [];
    $scope.loadAssetStepTwoIds = []; //this will be loaded with the children of the step one if cascade is selected otherwise just the roots

    $scope.loadAssetsCascade = true;
    $scope.loadAssetsLevels = 0;
    $scope.loadAssetsIncludeRoots = false;
    $scope.loadAssetsTypeCodesEnabled = true;
    $scope.loadAssetsTypeCodesSelected = [];

    $scope.loadAssetMetadata = true;

    //load default type codes into selected
    _.each(userVarTypeCodesDefaults,function(def) {
      var typeCode = _.find($scope.loadAssetsTypeCodes,function(code) {
        return code.id === def;
      });
      if(typeCode) $scope.loadAssetsTypeCodesSelected.push(typeCode);
    });

/*****************************************************************/
/**************************  5.2 Step One  *************************/
/*****************************************************************/

    $scope.getData = function(params) {
      $scope.loadAssetStepOneResultAssets = [];//reset
      $scope.loadAssetStepTwoIds = [];//reset

      //there is the option to pass in an array of ids, useful for other functions that need to load assets
      if(params && params.assetIds) {
        $scope.loadAssetIds = params.assetIds;
      }else{
        //get an array of all the ids
        $scope.loadAssetIds = $scope.loadAssetIdsString.split(',');
      }
      
      if(!$scope.loading) {//if already loading then no need to set total functions
        $scope.loaderOne.total = 2;
      }

      /*********************** IF CASCADE **************************/

      //if cascade is set AND input assetIds is not set
      if($scope.loadAssetsCascade && !(params && params.assetIds)) {
        //get all children 
        $scope.gatheredResults = [];
        $scope.getChildrenFunctions = [];
        

        var batchFunctionsChildrenAtts = {"get_attributes":1,"levels":$scope.loadAssetsLevels};
        //if user has selected any type codes set them in the batch
        if($scope.loadAssetsTypeCodesEnabled && $scope.loadAssetsTypeCodesSelected.length) {
          var typeCodes = [];
          _.each($scope.loadAssetsTypeCodesSelected,function(typeCode) {
            typeCodes.push(typeCode.id);
          });
          batchFunctionsChildrenAtts.type_codes = typeCodes;
        }
        
        //NOTE don't need to execute getGeneral because getChildren returns attributes
        var batchFunctionsChildren = $scope.makeBatchFunctions("getChildren",batchFunctionsChildrenAtts,$scope.loadAssetIds);

        $scope.loadingStart('Getting children...');
        $scope.executeBatchFunctions(batchFunctionsChildren,function(results) {
          //put children assets in resultAssets array
          _.each(results,function(result) {
              if(result.length) {
                _.each(result,function(asset) {
                  $scope.loadAssetStepOneResultAssets.push(asset);
                  $scope.loadAssetStepTwoIds.push(asset.id);
                });
              }
          }); //end each gatheredResults


          if($scope.loadAssetsIncludeRoots) {//if include roots is checked
            // execute getGeneral info on these ids
            var batchFunctionsGeneralRootNodes = $scope.makeBatchFunctions("getGeneral",{"get_attributes":1},$scope.loadAssetIds);
            //get general 
            $scope.loadingStart('Getting general info...');
            $scope.executeBatchFunctions(batchFunctionsGeneralRootNodes,function(results) {
              //put root node assets in resultAssets array
              _.each(results,function(asset) {
                $scope.loadAssetStepOneResultAssets.push(asset);
                $scope.loadAssetStepTwoIds.push(asset.id);
              });

              //finished getting general data
              $scope.loadAssetDataSet($scope.loadAssetStepOneResultAssets,'');
              $scope.getDataStepTwo();
            });
          }else{
            //finished getting general data
            if($scope.loadAssetStepOneResultAssets.length) {//sometimes has no children
              $scope.loadAssetDataSet($scope.loadAssetStepOneResultAssets,'');
              $scope.getDataStepTwo();
            }else{
              $scope.loading = false;
              $scope.message('error-true','No assets to load','Sorry, none of these assets had any children of the type codes specified.');
            }
          }          


        });//end $scope.executeBatchFunctions

      }else{ //else cascade

      /*********************** NO CASCADE **************************/

        //then just these assets
        $scope.loadAssetStepTwoIds = $scope.loadAssetIds;// if no cascadinfg then step 2 only needs these root nodes
        
        var batchFunctionsGeneral = $scope.makeBatchFunctions("getGeneral",{"get_attributes":1},$scope.loadAssetIds);
        //get general
        $scope.loadingStart('Getting general info...');
        $scope.executeBatchFunctions(batchFunctionsGeneral,function(results) {
          $scope.loadAssetStepOneResultAssets = results;
          $scope.loadAssetDataSet($scope.loadAssetStepOneResultAssets,'');
          if(params) {
            $scope.getDataStepTwo(params);
          }else{
            $scope.getDataStepTwo();
          }
        });
      }//end if cascade

    };

/*****************************************************************/
/**************************  5.3 Step Two  *************************/
/*****************************************************************/


    //this step loads metadata
    $scope.getDataStepTwo = function(params) {
        if($scope.loadAssetMetadata || (params && params.getMetadata)) {
          //get all ids first
          var batchFunctionsMeta = $scope.makeBatchFunctions("getMetadata",{},$scope.loadAssetStepTwoIds);
          //get metadata
          $scope.loadingStart('Getting metadata...');
          $scope.executeBatchFunctions(batchFunctionsMeta,function(results) {
            $scope.loadAssetDataSet(results,true);
            
            $scope.getMetadataFields(function() {
              $scope.getDataStepThree(params);
            });          
          });
        }else{
          $scope.getDataStepThree(params);
        }
    };

/*****************************************************************/
/**************************  5.4 Step THREE  *************************/
/*****************************************************************/

    $scope.getDataStepThree = function(params) {
      //FINISHED GETTING DATA
      $scope.loading = false;

      if(params && params.callBack) {
        params.callBack();
      }
    };



/*****************************************************************/
/**************************  5.5 Make Batch functions *************************/
/*****************************************************************/

    $scope.makeBatchFunctions = function(funcName,attributes,assetIds) {

        //builds the batch functions object depending on what you pass in
        var batchFunctions = {};
        var counter = 0;
        _.each(assetIds,function(assetId) {
          var newFunction = {
            "function":funcName,
            "args":{
              "asset_id":assetId
            }
          };

          _.extend(newFunction.args,attributes);
          
          batchFunctions[String(counter)] = newFunction;

          counter++;
        });
        return batchFunctions;
    };


/*****************************************************************/
/**************************  5.6 Load Asset Data Set *************************/
/*****************************************************************/


    $scope.loadAssetDataSet = function(dataSet,isMetadata) {

      //loads gathered dataset into the assets table
      _.each(dataSet,function(assetData,$index) {
        if(!assetData.error) {// check for error
          var id = $scope.loadAssetStepTwoIds[$index]; //get id from prepared asset ids

          //find seems a bit processor heavy but is needed for additional asset data loading
          var asset = _.find($scope.assets,function(asset) {
            return (String(asset.id) === String(id));
          });

          if(asset) {
            $scope.loadAssetFields(asset,assetData,isMetadata); //transfer all data to asset in table
          }else{
            var newAsset = {};
            $scope.loadAssetFields(newAsset,assetData,isMetadata); //transfer all data to new asset
            $scope.assets.push(newAsset); //if new then push new asset            
          }
        }else{
          //report error
        }
      });
    };


    $scope.loadAssetFields = function(asset,assetData,isMetadata) {

      for(var attId in assetData) {
        if(assetData.hasOwnProperty(attId)) {

          if(typeof asset[attId] === 'undefined' || String(asset[attId]) !== String(assetData[attId]) ) {
            //if it is a number save into assets as a number (so you can order properly by it)
            if(String(assetData[attId]).match(/^-?\d+\.?\d*$/) !== null) {
              asset[attId] = Number(assetData[attId]);
            }else{
              asset[attId] = assetData[attId];
            }
          }

          //add it to the fields selector if not there already
          if(!_.where($scope.fields,{"id":attId}).length) {
            var newField = {"id":attId,"name":$scope.prettifyName(attId)};
            //default display fields
            if(userVarFieldsDisplayDefaults.indexOf(attId) !== -1) {$scope.fieldsDisplay.push(newField);}
            if(isMetadata) {newField.isMetadata = true;}else{newField.isMetadata = false;}//will need that for the displaying the field names later
            $scope.fields.push(newField);
          }

          //METADATA
          if(isMetadata) {
            //FOR METADATA SCHEMA GATHERING, get an asset id assigned to each metadata schema field
            if(!$scope.getMetadataAssetIds[attId]) {$scope.getMetadataAssetIds[attId] = asset.id;}
          }
        }
      }// end for loop
    };


/*****************************************************************/
/********************  5.7 Get Metadata fields *******************/
/*****************************************************************/


    //We don't want to execute getMetadataSchema on every asset in the table (request would take too long)
    //we just need to find a few assets in the table that, between them, cover all the metadata fields we need
    $scope.getMetadataAssetIds = {}; //this is being populated when creating the fields, we're getting an asset id for each metadata schema field e.g. {"Global.Approver":1432,"Global.Role":94875,"Global.Publish.Date"}
    $scope.getMetadataFields = function(callBack) {

      var ids = [];
      _.each($scope.getMetadataAssetIds,function(id) {
        if(ids.indexOf(id) === -1) {ids.push(id);}
      });

      var getMetadataFieldsBatchFunctions = $scope.makeBatchFunctions("getMetadataSchema",{},ids);

      $scope.loadingStart('Getting metadata fields...');
      $scope.executeBatchFunctions(getMetadataFieldsBatchFunctions,function(results) {
        var allSchemas = {};

        //put all schemas into one object
        _.each(results,function(result) {
          if(!result.error) {
            _.extend(allSchemas,result);
          }
        });

        //iterate through schemas
        for(var key in allSchemas) {
          if(allSchemas.hasOwnProperty(key)) {
            var schema = allSchemas[key];
            if(schema !== []) {//checking for empty schema (empty returns [])
              //iterate through schema fields
              for(var key2 in schema) {
                if(schema.hasOwnProperty(key2)) {
                  //give the real field in $scope.fields all this data
                  var field = schema[key2];
                  var fieldName = field.name.value;

                  if(!_.where($scope.fieldsMetadata,{id:fieldName}).length) {//if not already in meta fields

                    var actualField = _.where($scope.fields,{id:fieldName});
                    if(actualField.length === 1) {
                      actualField[0].meta_id = key2;
                      actualField[0].meta_friendly_name = field.friendly_name.value;
                      actualField[0].meta_description = field.description.value;
                      actualField[0].meta_editable = field.editable.value;
                      actualField[0].meta_required = field.required.value;

                      $scope.fieldsMetadata.push(actualField[0]);
                    }
                  }//end - if not already in meta fields
                }
              }


            }
          }
        }

        callBack();
      });
    };

/*****************************************************************/
/*****************************************************************/
/*****************************************************************/
/***********************  6 Execute Actions  *******************/
/*****************************************************************/
/*****************************************************************/
/*****************************************************************/

/*****************************************************************/
/*********************  6.1 Vars and helpers  ******************/
/*****************************************************************/


  $scope.actionsBatchFunctionsTest = true;

  $scope.selectedAction = _.where($scope.actionsList,{funcName:"getAssetTypes"})[0]; // most common function

  $scope.executeSelectedRadio = 'all';

  $scope.batchFunctions = [];

  $scope.selectedActionChanged = function() {
    //initialise the select field vars
    var selectVars = _.where($scope.selectedAction.vars,{type:"select"});
    if(selectVars.length) { //if there are any select vars
      _.each(selectVars,function(variable,$index) {
        if(variable.ops.length && variable.val === null) { //if it has null then give it the first option
          variable.val = variable.ops[0][variable.opsKey];
        }
      });
    }
  };


/*****************************************************************/
/****************** 6.2 Execute actions function  **************/
/*****************************************************************/  


  $scope.executeActions = function() {
    var assetsActioning = [];
    var assetsActioningIds = [];
    //if radio is on selected then get just those
    if($scope.executeSelectedRadio === 'selected') {
      assetsActioning = $filter('orderBy')($scope.assetsSelected,$scope.sort.array);
    }else{
      assetsActioning = $filter('orderBy')($scope.assets,$scope.sort.array);
    }

    if($scope.selectedAction.assetVarName !== null && assetsActioning.length === 0) {
      $scope.message('error-true','No assets selected','Please select some assets in the table above.');
      return null;
    }
    if($scope.selectedAction === null) {
      $scope.message('error-true','No action selected','Please select an action from the dropdown on the left.');
      return null;
    }

    //check for required vars
    var missingField = false;
    _.each($scope.selectedAction.vars,function(fieldVar) {
      if(fieldVar.required && fieldVar.val === '') {missingField = true;}
    });
    if(missingField) {
      $scope.message('error-true','Required fields',"Please fill out all fields marked with a '*'");
      return null;
    }

    if($scope.selectedAction.assetVarName !== null) {
      //check for required vars
      var csvInvalid = false;
      _.each($scope.selectedAction.vars,function(fieldVar) {
        if((fieldVar.csv && $scope.executeSelectedRadio === 'selected' && fieldVar.val.split(',').length !== $scope.assetsSelected.length) || (fieldVar.csv && $scope.executeSelectedRadio === 'all' && fieldVar.val.split(',').length !== $scope.assets.length)) {csvInvalid = true;}
      });
      if(csvInvalid) {
        $scope.message('error-true','CSV field error',"Wrong amount of values in CSV field. Please make sure it matches the number of assets you're actioning");
        return null;      
      }


      //didnt want to search through all field names a lot, so we're searching for any used keywords
      var valuesConcatenated = '';
      _.each($scope.selectedAction.vars,function(fieldVar) {
        valuesConcatenated += fieldVar.val + ' ';
      });

      //prepare keywords
      //$scope.keywordsInUseGather(valuesConcatenated);

      //get all assetsActioningIds from assetsActioning array
      _.each(assetsActioning,function(asset) {
        assetsActioningIds.push(asset.id);
      });
    }//end if no asset action


    var batchFunctionsActionsExecute = [];
    if($scope.selectedAction.assetVarName !== null) {
      batchFunctionsActionsExecute = $scope.prepareActionBatchFunctions(assetsActioningIds);
    }else{
      batchFunctionsActionsExecute = $scope.prepareActionBatchFunctionSingle();
    }

    if($scope.actionsBatchFunctionsTest) {
      $scope.message('','Your batch of functions',batchFunctionsActionsExecute);  
    }else{

      $scope.loaderOne.total = 3;
      $scope.loadingStart('Executing ' + $scope.selectedAction.name + '...');
      $scope.executeBatchFunctions(batchFunctionsActionsExecute,function(results) {
        $scope.loading = false;
        $scope.errorCheckResults(
          results,
          function(results, successCount) {
            $scope.message('success', 'Action batch functions successfully executed',results);  
          },
          function(results, errorCount, successCount) {
            $scope.message('warning',successCount + ' action batch functions successfully executed with '+ errorCount +' errors',results);  
          },
          function(results) {
            $scope.message('error-true','Did not run due to an error',results);  
          }
        );
        //if it was a group asset function
        if($scope.selectedAction.assetVarName) {
          $scope.loadingStart('Reloading actioned assets...');
          $scope.getData({"assetIds":assetsActioningIds});
        }

      });
    }
    

  };

/*****************************************************************/
/**************************  6.3 Prepare actions batch functions  ***********************/
/*****************************************************************/


/******  6.3.1 Prepare batch functions (single) ********/
$scope.prepareActionBatchFunctionSingle = function() {
  var batchFunctionsToExecute = [];
  var newFunction = {
     "function":$scope.selectedAction.funcName,
     "args":{}
  };

  $scope.prepareActionBatchFunctionsSetVars(newFunction,null,null,null,null);

  batchFunctionsToExecute = [{"0":newFunction}];

  return batchFunctionsToExecute;
};

/******  6.3.2 Prepare batch functions (multiple)  ********/
$scope.prepareActionBatchFunctions = function(assetIds) {

  var batchFunctionsToExecute = {};
  var counter = 0;

  _.each(assetIds,function(assetId, index) {
    var newFunction = {
       "function":$scope.selectedAction.funcName,
       "args":{}
    };
    //set the child_id/asset_id etc to the id of the asset
    newFunction.args[$scope.selectedAction.assetVarName] = assetId;

    //only add blocking until second last item
    if(counter < (assetIds.length-1)) {
      if($scope.selectedAction.blocking) {
        newFunction.blocking = 1;
      }else{
        newFunction.blocking = 0;
      }
    }

    $scope.prepareActionBatchFunctionsSetVars(newFunction,assetId,index,counter);

    batchFunctionsToExecute[String(counter)] = newFunction;
    counter++;
  });// end assets iteration

  return batchFunctionsToExecute;

};





/******  6.3.4 Set vars  ********/
  $scope.prepareActionBatchFunctionsSetVars = function(newFunction,assetId,index,counter) {

        //we're only setting the vars that have set = true
        var setVars = _.where($scope.selectedAction.vars,{set:true});

        //add vars' values
        _.each(setVars,function(variable) {

          if(variable.set) {//if set

              //initialise to just val, might be overwritten
              newFunction.args[variable.name] = variable.val;

              //only if you get a text input
              if((variable.type === 'string' || variable.type === 'integer') && assetId !== null) {

                var stringVal = '';
                var csvValues = [];

                if(!variable.csv) {//if not csv
                  stringVal = variable.val;
                }else{
                  //CSV CSV CSV CSV CSV CSV CSV CSV 
                  //TODO - maybe improve this so it's not splitting every time
                  csvValues = variable.val.split(',');
                  stringVal = csvValues[index];
                }

                stringVal = $scope.keywordsReplace(stringVal,assetId,counter);

                newFunction.args[variable.name] = stringVal;

              }else if(variable.type === 'select') {
                newFunction.args[variable.name] = variable.val;
              }

          }//end if set

          //if var is required by js api then, set to nothing
          if(!newFunction.args[variable.name] && variable.setRequired) {
            newFunction.args[variable.name] = "";
          }

        });  
  };// end set vars











/************************************************************************/
/*****************************************************************************/
/**************************  7. Bulk CSV Change  ***********************/
/*****************************************************************************/

/************************************************************************/


/*****************************************************************************/
/**************************  7.1 Vars and helpers  ***********************/
/*****************************************************************************/


$scope.csvChangeChangesChecked = false;

$scope.csvChangeDivider = ',';
$scope.csvChangeChkBatchFunctionsTest = true;
$scope.csvChangeAssetsLoaded = false;
$scope.csvChangeReload = false;

$scope.csvChangeAssets = [];
$scope.csvChangeChanges = [];
$scope.csvChangeIds = [];

$scope.csvChangeTxtCsv = 'id,name,125\n1455,Employee 1,Test Note 1\n1459,Employee 2,\n1463,Employee 3,\n1467,Employee 4,\n1471,Employee 5,\n1475,Employee 6,Test Note 6\n1479,Person 7,\n1483,Person 8,\n1487,Employee 9,Test Note 9\n1491,Employee 10,';


/*****************************************************************************/
/**************************  7.2 Check for changes  ***********************/
/*****************************************************************************/


/***************  7.2.1 Step One  ************/
$scope.csvChangeBtnCheckForChanges = function() {
  $scope.csvChangeAssets = [];
  $scope.csvChangeChanges = [];
  $scope.csvChangeIds = [];

  $scope.checkValidCsv($scope.csvChangeTxtCsv,$scope.csvChangeDivider,
    function(errors) {
      $scope.message('error-true','CSV invalid',errors);
    },function() {
      $scope.csvChangeAssets = $scope.convertChangesCsvToAssetArray($scope.csvChangeTxtCsv,$scope.csvChangeDivider);

      //get ids and load data so we can compare
      var ids = [];
      _.each($scope.csvChangeAssets,function(csvAsset) {
        ids.push(csvAsset.id);
      });


      if($scope.csvChangeReload || !$scope.csvChangeAssetsLoaded) {
        //TODO check for new assets

        $scope.getData({"assetIds":ids,"getMetadata":true,callBack:function() {
          //TO DO must check for erroneous assets see if assets in 
          //non existent ids eg
          //$scope.message('error-true',"Some assets couldn't be compared...",unloadedAssets);

          //DISALLOW next step so that

          //some assets have been loaded, now we can reload if needed
          $scope.csvChangeAssetsLoaded = true;

          $scope.csvChangeBtnCheckForChangesStep2();
        }});
      }else{
        $scope.csvChangeBtnCheckForChangesStep2();
      }
    }
  );//end csv check
};

/***************  7.2.2 Step Two  ************/
$scope.csvChangeBtnCheckForChangesStep2 = function() {

    var counter = 0;

    //now we can compare
    _.each($scope.csvChangeAssets,function(csvAsset) {//go through each asset
      
      var originalAsset = _.where($scope.assets,{id:Number(csvAsset.id)})[0];

      for(var key in csvAsset) {//go through each att
        
        if(csvAsset.hasOwnProperty(key)) {
          var newChange = {
            "id":csvAsset.id,
            "field":key,
            //"to":csvAsset[key],
            "to":$scope.keywordsReplace(csvAsset[key],csvAsset.id,counter),
            "from":''
          };

          if(String(newChange.field).match(/^-?\d+\.?\d*$/) !== null) {//check if it's a number
            newChange.isMetadata = true;
            //get display field
            
            var field = _.where($scope.fields,{meta_id:key})[0];
            
            if(field){
              newChange.from = originalAsset[field.id];            
            } else {
              //TODO change to proper reporting
              newChange.from = 'ERROR: FIELD NOT FOUND!!';
              alert('Could not find field "' + key + '".\nCheck these assets have the field');
            }

          }else{
            newChange.isMetadata = false;
            
            if(originalAsset.hasOwnProperty(key)) newChange.from = originalAsset[key];
          }

          if(String(newChange.from) !== String(newChange.to)) {
            $scope.csvChangeChanges.push(newChange);
            $scope.csvChangeIds.push(newChange.id);
          }
        }
      }

      counter++;
    });

    $scope.csvChangeChangesChecked = true;
};


/*****************************************************************************/
/**************************  7.3 Convert Csv To Array of assets  ***********************/
/*****************************************************************************/

$scope.convertChangesCsvToAssetArray = function(csv,divider) {
  var assetsArray = [];
  var csvArray = $scope.convertCsvToArray(csv,divider);
  var assetRows = csvArray.splice(1,csvArray.length-1);//will leave csvArray with the first row and assetRows with the rest
  var fields = csvArray[0]; //the one item left in csvArray is the fields array

  _.each(assetRows,function(assetRow) {
    var newAsset = {};

    _.each(fields,function(field,$index) {
      newAsset[field] = assetRow[$index];
    });
    assetsArray.push(newAsset);
  });

  return assetsArray;
};

/*****************************************************************************/
/**************************  7.4 Execute Changes  ***********************/
/*****************************************************************************/

$scope.csvChangeBtnExecuteChanges = function() {
  var csvChangeBatchFunctions = $scope.csvChangeMakeBatchFunctions();

  if($scope.csvChangeChkBatchFunctionsTest) {
    $scope.message('','Your batch of functions',csvChangeBatchFunctions);  
  }else{
    $scope.loaderOne.total = 3;
    $scope.loadingStart('Making changes...');
    $scope.executeBatchFunctions(csvChangeBatchFunctions,function(results) {
      $scope.getData({"assetIds":$scope.csvChangeIds,callBack:function() {
        $scope.message('success','Changes made',results);
      }});
    });
  }
};


/*****************************************************************************/
/**************************  7.5 Make Batch Functions  ***********************/
/*****************************************************************************/

$scope.csvChangeMakeBatchFunctions = function() {

  var csvBatchFunctions = {};
  _.each($scope.csvChangeChanges,function(change,$index) {
    var newFunction = {
      "args":{
        "asset_id":change.id
      },
      "blocking":0
    };

    if(change.isMetadata) {
      newFunction["function"] = 'setMetadata';
      newFunction.args.field_id = change.field;
      newFunction.args.field_val = change.to;
    }else{
      newFunction["function"] = 'setAttribute';
      newFunction.args.attr_name = change.field;
      newFunction.args.attr_val = change.to;
    }

    csvBatchFunctions[$index] = newFunction;
  });

  return csvBatchFunctions;

};






/*****************************************************************/
/*****************************************************************/
/*****************************************************************/
/************************  8. Bulk Create  *************************/
/*****************************************************************/
/*****************************************************************/
/*****************************************************************/

$scope.parentAssetId = '4044';
$scope.createType = 'normal';

$scope.createAddField = false;
$scope.createExtraAttField = 'start_date';
$scope.createExtraAttValue = '2014-05-06';

$scope.createNameCSV = 'Acids and Alkalis,Aerosol Cans,Air Conditioners (plastic),Aluminium cans,Aluminium foil - clean,Aluminium foil - soiled,Ammunition,Animal droppings,Asbestos,Asphalt,BBQ chicken bags,Baskets,Bathtubs, sinks and vanities,Beer bottles and cans,Bicycles,Biscuit trays,Blankets and bedsheets,Bones,Books,Bottle Tops - Metal,Bottle Tops - Plastic,Bottles,Branches,Bread,Bricks,Bubble wrap,Building materials,Butter wrappers,CDs,Cake trays,Car batteries,Car parts,Carbon paper,Cardboard - unwaxed,Cardboard - waxed,Carpets & underlay,Cartridges,Cassette tapes,Cat litter,Cellophane,Ceramics and Crockery,Chlorine and Pool Chemicals,Christmas cards (used),Christmas trees - fake,Christmas trees - live,Cigarette butts,Cigarette packets,Clean Fill / Soil known as VENM,Cleaners - Household,Cling wrap,Clothing,Coat hangers,Cockroach baits,Coffee grinds,Commercial Waste,Computers,Concrete,Construction Waste,Corks,Cupboards,Demolition waste,Detergent bottles,Dialysis Waste,Disposable nappies,Doors,Drums - Metal, empty,Egg cartons - cardboard,Electronic and electrical waste,Engine Oil,Envelopes,Envelopes - with and without windows,Eye glasses,Fabric,Fencing - Colorbond ,Cyclone and other metal fencing,Fibro,Fire extinguishers,Flares,Flowers,Fluorescent tubes and globes,Foam boxes, meat trays, cups,Food scraps,Fridge & Freezers,Fruit scraps and peelings,Fuel,Fungicides,Furniture,Garden Waste,Garden hoses and tools,Gas bottles/cylinders,Glass - broken and wrapped,Glass jars and bottles,Grass clippings,Greeting cards,Guttering - Metal,Gyprock/Plasterboard,Hair clippings,Hazardous chemicals,Herbicides,Hobby chemicals,Hot water systems,Household Cleaners,Ice cream containers,Illegal waste,Insulation batts,Jar lids (plastic/metal),Jars,Juice cartons,Junk mail,Kitchen cupboards and sinks,Kitty litter,Lattice,Lawn mowers,Lead crystal,Leaves,Light globes - wrapped,Linoleum,Logs,Magazines,Manure,Margarine Tubs,Masonite,Matchboxes,Mattresses,Meat scraps,Meat trays,Medicine bottles (empty & rinsed),Medicines - expired,Metal electrical appliances,Metal roofing,Microwave meal plates and bowls,Milk Crates,Milk and juice cartons (liquid paperboard),Mirrors,Mobile Phoness,Motor oil containers - empty,Motor oils, fuels and fluid,Nappies - disposable,Needles (syringes),Newspapers - clean,Newspapers - soiled,Oil - cooking,Oil - motor,Paint tins (empty and dry),Paint tins (half empty),Paints, Solvents and Cleaners,Pallets,Palm trees and fronds,Paper,Perspex,Pesticides,Pet food tins,Petrol,Pill and tablet packets,Pine - treated,Pizza boxes - clean,Pizza boxes - with food,Plastic - Nos. 1-7,Plastic bags,Plastic film, shrink and cling wrap,Poisons,Polystyrene,Pool Chemicals,Printer Ink Cartridges,Razors - disposable,Renovation waste,Ribbons,Roof Tiles,Rope,Sand and soil,Sandstone,Sanitary items (pads, tampons),Scrap metal,Seedling trays and containers,Shampoo and conditioner bottles,Shoes,Shopping trolleys,Smoke alarms/detectors,Soft drink bottles and cans,Solvents,Steel - other,Steel cans,Stoves and ovens,Styrofoam,Syringes/sharps,Takeaway food containers,Teabags,Telephone books,Televisions,Tiles - roof, bathroom,Timber - treated, painted, large pieces,Timber - untreated, unpainted, small offcuts,Tin cans,Tissues,Toilets,Towels,Toys,Tree stumps,Tyres,Vacuum cleaner dust,Vegetable scraps and peelings,Vegetation and thorny prunings,Vinyl,Weeds,White goods,Window glass (broken, wrapped),Windows frames,Wine cask bladders,Wood dust and shavings,Wrapping paper,X-ray films,Yoghurt containers';
$scope.createNumberOfAssets = 5;
$scope.createName = 'Number %index% asset';
$scope.createTypeCodeSelected = _.where($scope.loadAssetsTypeCodes,{id:'calendar_event_single'})[0];
$scope.createAssetsLoadAfter = true;
$scope.createBatchFunctionsTest = true;



$scope.createAssets = function() {

  var batchFunctionsCreateAssets = $scope.makeCreateAssetsBatchFunctions();

  if($scope.createBatchFunctionsTest) {
    $scope.message('','Your batch of functions',batchFunctionsCreateAssets);  
  }else{
    $scope.loaderOne.total = 3;
    $scope.loadingStart('Creating ' + $scope.createTypeCodeSelected.name + "s...");
    $scope.executeBatchFunctions(batchFunctionsCreateAssets,function(results) {


      if($scope.createFunctionsReversed) {
        results.reverse();
      }

      //if() {//error check
        $scope.message('success','Assets Created',results);

        var resultIds = [];
        _.each(results, function(result) {
          if(result.id) {
            resultIds.push(result.id);
          }
        });

        if($scope.createAssetsLoadAfter) { 
          $scope.getData({"assetIds":resultIds});
        }else{
          $scope.loading = false;
        }

    });
  }//end batch functions test
  
};



$scope.makeCreateAssetsBatchFunctions = function() {
    //builds the batch functions object depending on what you pass in
    
    var batchFunctions = {};
    var names = null;

    if($scope.createType === 'CSV') {
      names = $scope.createNameCSV.split(',');     
    }

    if($scope.createType === 'normal') {
      names = [];
      for(var n = 0;n < $scope.createNumberOfAssets;n++) {
        var asset_name = $scope.createName.replace('%index%',String(n+1));
        names.push(asset_name);
      }
    }



    if(names.length) {

      if($scope.createFunctionsReversed) {
        names.reverse();
      }


      for(var m = 0;m < names.length;m++) {
        var newFunction = {
          "function":'createAsset',
          "args":{
            "parent_id":$scope.parentAssetId,
            "type_code":$scope.createTypeCodeSelected.id,
            "asset_name":names[m]
          },
          "blocking":0
        };

        //if the extra att field is populated then add it to the args
        if($scope.createAddField) {
          if($scope.createExtraAttField && $scope.createExtraAttValue) {
            newFunction.args.extra_attributes = 1;
            newFunction.args[$scope.createExtraAttField] = $scope.createExtraAttValue;
          }else{
            $scope.message('error-true','Required',"Please set the extra attribute");
          }
        }

        batchFunctions[String(m)] = newFunction;
      }



    }else{
      $scope.message('error-true','No assets created',"Sorry the CSV didn't have any valid names. \n\nPlease make sure you separate them with commas\n\nE.g. 'Development types,Related links,Development categories,Exempt development,Complying development'");
    }// end if names.length

    return batchFunctions;
};







/************************************************************************/
/************************************************************************/
/************************************************************************/
/************************  9. Structure Create  *************************/
/************************************************************************/
/************************************************************************/
/************************************************************************/




$scope.structureCreateTxtRoot = '4044';
$scope.structureCreateReady = false;
$scope.structureCreateErrorText = '';
$scope.structureCreateCounts = {};
$scope.structureCreateDivider = ',';


$scope.structureCreateTxtCsv = 'Home(page_standard)\nAbout Us(page_standard)\nContact(page_standard)\nContact(page_standard),Where We Are(page_standard)\nContact(page_standard),Opening Hours(page_standard),Sydney(page_standard)\nDocuments(folder),Important(folder),Document 1(page_standard)\nDocuments(folder),Not so important(folder),Document 2(page_standard)\nContact(page_standard),Opening Hours(page_standard),Melbourne(page_standard)\nAbout Us(page_standard),Location(page_standard)\nNames(page_standard),George(page_standard)';

$scope.structureCreateArray = [];
$scope.structureCreateObject = {};

$scope.structureCreateBtnCheck = function() {
  $scope.structureCreateReady = false;
  $scope.structureCreateErrorText = '';
  $scope.structureCreateObject = {};
  $scope.structureCreateArray = [];
  $scope.structureCreateCounts = {"total":0};

  $scope.convertStructureCsv(
    $scope.structureCreateTxtCsv,
    function() {//success function
      //TODO show number of assets
      $scope.structureCreateReady = true;
    },
    function() {//fail function
      $scope.message('error-true',"Oops! CSV had some errors...",$scope.structureCreateErrorText);
    }
  );
};


$scope.convertStructureCsv = function(csv,successCallback,errorCallback) {
  var rows = csv.split('\n');


  _.each(rows,function(rowStr,$index) {
    var row = rowStr.replace(/^\s+|\s+$/g,'');//remove whitespace
    if(row !== '') {
      $scope.convertStructureCsvLoadRow(row,$index);
    }
  });

  if($scope.structureCreateErrorText === '') {
    //TODO count types from $scope.structureCreateArray

    _.each($scope.structureCreateArray,function(assetRow) {
      _.each(assetRow,function(asset) {
        if(!$scope.structureCreateCounts[asset.type]) $scope.structureCreateCounts[asset.type] = 0; //if it doesnt exist create it 
        $scope.structureCreateCounts[asset.type]++; //increment page_standard:33 to page_standard:34 
        $scope.structureCreateCounts.total++;
      });
    });

    successCallback();
  }else{
    errorCallback($scope.structureCreateErrorText);
  }
};

$scope.convertStructureCsvLoadRow = function(rowString,rowIndex) {
  var pages = rowString.split($scope.structureCreateDivider); //Contact,Opening Hours,Sydney
  var checkPointer = $scope.structureCreateObject;
  var currentParentName = null;

  _.each(pages,function(pageStr,$index) {

    //BUILD STRUCTURE ARRAY
    if(!$scope.structureCreateArray[$index]) {//if there's no array for this level then make it
      $scope.structureCreateArray[$index] = [];
    }

    var y = pageStr.indexOf('(');
    var z = pageStr.indexOf(')');

    var currentName = '';
    var type = '';

    if(y === -1 || z === -1) {//CHECK for brackets
      $scope.structureCreateErrorText += 'Row ' + String(rowIndex+1) + ', item ' + String($index+1) + ' - "' + pageStr +  '" has a bracket missing (Please correct the format e.g. Home(page_standard)\n';
    } else {
      type = pageStr.substr(y+1,z-y-1);
      currentName = pageStr.substr(0,y);

      $duplicateName = _.where($scope.structureCreateArray[$index],{name:currentName});
      //or if parent has different name and this is a duplicate
      if($duplicateName.length === 0 || //if there are no duplicates
        ($duplicateName.length > 0 && ($duplicateName.parentName !== currentParentName))) {//if the parents are different and there are duplicates, then its ok
        var newAsset = {
          name:currentName,
          type:type
        };

        if(currentParentName !== null) {// if there is a parent name, replace it with its position in the previous level's array, so it can be found in the results later
          var parentAsset = _.where($scope.structureCreateArray[$index-1],{name:currentParentName})[0];
          var parentPosition = $scope.structureCreateArray[$index-1].indexOf(parentAsset);
          newAsset.parent = parentPosition;
          newAsset.parentName = currentParentName;
        }else{
          newAsset.parent = null;
          newAsset.parentName = currentParentName;
        }

        $scope.structureCreateArray[$index].push(newAsset);  
      }//end check format

      currentParentName = currentName;//set the parent name to this name
    }//end check brackets
//  }

    //BUILD HEADINGS OBJECT
    if(!checkPointer.hasOwnProperty(pageStr)) {//if there's no object here then make it
      checkPointer[pageStr] = {};
    }
    checkPointer = checkPointer[pageStr]; //point to this attribute now
  });
};

$scope.structureCreateBtnCreate = function() {
  if($scope.createFunctionsReversed) {
    $scope.structureCreateReverseArray();
  }

  $scope.structureCreateBtnCreateStepOne();
};


$scope.structureCreateReverseArray = function() {
  var newArray = [];

  var reverseArrayPosition = function(arrayLength,position) {
    return (arrayLength-1) - position;
  };

  _.each($scope.structureCreateArray,function(levelArray, $index) {
    var prevLevelIndex = $index - 1;
    var reversedLevelArray = levelArray.reverse();
    if(reversedLevelArray[0].parent !== null) {//if the item is null then its the top level, do nothing
      _.each(reversedLevelArray,function(item) {//reverse all the positions of the parents
        item.parent = reverseArrayPosition($scope.structureCreateArray[prevLevelIndex].length,item.parent);
      });
    }

    newArray.push(reversedLevelArray);
  });

  return newArray;
};

$scope.functionsArray = [];
$scope.structureCreateResults = [];
$scope.structureCreateBtnCreateStepOne = function(finalCallback) {
  $scope.loaderOne.total = $scope.structureCreateArray.length + 2;
  $scope.loadingStart('Creating structure...');

  $scope.functionsArray = [];
  $scope.structureCreateResults = [];

  _.each($scope.structureCreateArray,function(assetsRow) {
    var levelFunction = function(index,results) {
      var newBatch = [];
      if(results) {//only first level will have no results
        newBatch = $scope.structureCreateMakeBatchFunctions(assetsRow,results); //pass to the next function
      }else{
        newBatch = $scope.structureCreateMakeBatchFunctions(assetsRow);
      }

      $scope.loadingStart('Creating level ' + String(index + 1) + ' assets...');
      $scope.executeBatchFunctions(newBatch,function(funcResults) {
        $scope.structureCreateResults.push(funcResults);
        //put root node assets in resultAssets array

        if($scope.functionsArray[index+1]) {//go to next function
          $scope.functionsArray[index+1](index+1,funcResults);
        }else{//finished
          $scope.structureCreateBtnCreateStepTwo();
        }
      });
    };

    $scope.functionsArray.push(levelFunction);
  });

  $scope.loaderOne.total = $scope.functionsArray.length + 2;

  $scope.functionsArray[0](0);
};

$scope.structureCreateBtnCreateStepTwo = function() {

  if($scope.createFunctionsReversed) {
    $scope.structureCreateResults.reverse();
  }

  $scope.errorCheckResults(
    $scope.structureCreateResults,
    function(results, successCount) {
      $scope.message('success','All ' + successCount + ' assets created...',results);  
    },
    function(results, errorCount, successCount) {
      $scope.message('warning', successCount + ' assets created with '+ errorCount +' errors...',results);  
    },
    function(results) {
      $scope.message('error-true','Did not create any assets due to an error...',results);  
    }
  );

  var resultIds = [];
  _.each($scope.structureCreateResults, function(resultSet) {
    _.each(resultSet, function(result) {
      if(result.id) {
        resultIds.push(result.id);
      }
    });
  });

  $scope.getData({"assetIds":resultIds});

  //TODO get data of all the ids from the results
  $scope.loading = false;
  $scope.message('success',"All " + resultIds.length + " assets created...",$scope.structureCreateResults);
};

$scope.structureCreateMakeBatchFunctions = function(assetsRow,results) {

  /*
    structure of assets row is 
    [
      {name:"Where We Are",parent:2,type:'page_standard'},
      {name:"Opening Hours",parent:2,type:'page_standard'},
      {name:"Location",parent:1,type:'page_standard'}
    ]
  */

  var batchFunctionsArray = [];

  //get all different asset typesout of assetRow

  //for each asset type make chunked batch

  var assetsArrayOfArrays = $scope.divideArray(assetsRow);

  _.each(assetsArrayOfArrays,function(array,$index) {
    if(results) {//if there's results passed, then this level will be made based on those results
      batchFunctionsArray.push($scope.structureCreateMakeBatchFunctionsChunk(array,results));//needs ALL the results as the parent could be any one of them
    }else{
      batchFunctionsArray.push($scope.structureCreateMakeBatchFunctionsChunk(array));
    }
  });

  return batchFunctionsArray;
};



$scope.structureCreateMakeBatchFunctionsChunk = function(assets,results) {
  var batchFunctions = {};

  for(var n = 0;n < assets.length;n++) {
    var newFunction = {
      "function":'createAsset',
      "args":{
        "type_code":assets[n].type,
        "asset_name":assets[n].name
      },
      "blocking":0
    };

    if(results) {
      newFunction.args.parent_id = results[assets[n].parent].id;
    }else{
      newFunction.args.parent_id = $scope.structureCreateTxtRoot;
    }

    batchFunctions[String(n)] = newFunction;
  }

  return batchFunctions;
};






/************************************************************************/
/************************************************************************/
/************************************************************************/
/**************************  10. IA Convert  ****************************/
/************************************************************************/
/************************************************************************/
/************************************************************************/

$scope.iaTxtCsv = 'Home\nAbout Us\nContact\nContact,Where We Are\nContact,Opening Hours,Sydney\nContact,Opening Hours,Melbourne\nAbout Us,Location\nNames,George';
$scope.iaStructureObject = {};
$scope.iaStructureHtml = '';
$scope.iaBtnConvert = function() {
  $scope.iaStructureObject = {};
  $scope.iaStructureHtml = '';
  var rows = $scope.iaTxtCsv.split('\n');

  _.each(rows,function(rowStr,$index) {
    var row = rowStr.replace(/^\s+|\s+$/g,'');//remove whitespace
    if(row !== '') {
      $scope.iaCsvLoadRow(row,$index);
    }
  });

  $scope.iaObjToHtml($scope.iaStructureObject,1);


  $scope.message('success',"Here's your site structure creation HTML...",$scope.iaStructureHtml);
};

$scope.iaCsvLoadRow = function(rowString,rowIndex) {
  var pages = rowString.split(','); //Contact,Opening Hours,Sydney
  var checkPointer = $scope.iaStructureObject;
  var currentParentName = null;

  _.each(pages,function(pageStr,$index) {
    //BUILD HEADINGS OBJECT
    if(!checkPointer.hasOwnProperty(pageStr)) {//if there's no object here then make it
      checkPointer[pageStr] = {};
    }
    checkPointer = checkPointer[pageStr]; //point to this attribute now
  });
};

$scope.iaObjToHtml = function(obj, level) {
  for (var key in obj) {
     if (obj.hasOwnProperty(key)) {
        for(var t = 1;t<level;t++) {$scope.iaStructureHtml += '\t';}
        $scope.iaStructureHtml += ('<h'+level+'>' + key.replace(/^\s+|\s+$/g,'') + '</h'+level+'>');
        $scope.iaStructureHtml += '\n';
        $scope.iaObjToHtml(obj[key],level+1);
     }
  }
};








/*****************************************************************/
/*****************************************************************/
/*****************************************************************/
/************************  15. Reporting  *************************/
/*****************************************************************/
/*****************************************************************/
/*****************************************************************/


/*****************************************************************/
/************************  15.1 Message  *************************/
/*****************************************************************/



  $scope.messageTitle = "Messaging box";
  $scope.messageContent = "";
  $scope.messageType = "";


  $scope.message = function(type,title,content) {
    $scope.messageType = type; //success/warning/error
    $scope.messageTitle = title;
    $scope.messageContent = content;
    $scope.cpanel.changeTab(3); // change to tab 3 for the message box
  };

  $scope.messageClear = function() {
    $scope.messageType = ""; //success/warning/error
    $scope.messageTitle = "Messaging box";
    $scope.messageContent = "";
  };


/*****************************************************************/
/***************************  15.2 Get CSV  ****************************/
/*****************************************************************/

$scope.csvDivider = ',';
$scope.csvSelectedRadio = 'all';
$scope.csvType = 'vertical';

$scope.getCSV = function() {
  var myCSV = '';


  var assets = [];
  //if radio is on selected then get just those
  if($scope.csvSelectedRadio === 'selected') {
    if($scope.assetsSelected.length) {
      assets = $scope.assetsSelected;
    }else{
      $scope.message('error-true',"No assets selected","Please select some assets in the table first");
      return null;
    }

    if(!$scope.fieldsDisplay.length) {
      $scope.message('error-true',"No fields selected","Please select a field from the display fields list on the right");
      return null;
    }
    
  }else{
    assets = $scope.assets;
  }

  //if someone wants to use tab
  if($scope.csvDivider === 'tab')$scope.csvDivider = '\t';

  var orderedAssets = $filter('orderBy')(assets,$scope.sort.array);

  if($scope.csvType === 'vertical') {
    // start building csv
    myCSV += 'id' + $scope.csvDivider;
    _.each($scope.fieldsDisplay,function(field, index) {
      if(field.isMetadata) {
        myCSV += field.meta_id;
      }else{
        myCSV += field.id;
      }

      if(index < ($scope.fieldsDisplay.length-1)) {myCSV += $scope.csvDivider;}
    });
    myCSV += '\n';

    _.each(orderedAssets,function(asset) {
      myCSV += asset.id + $scope.csvDivider;
      _.each($scope.fieldsDisplay,function(field, index) {
        //apply date filter to values
        if(asset[field.id]) {myCSV += $filter('prettifyDate')(asset[field.id],$scope.prettyDateFormat,$scope.prettyDates,$scope.prettyDatesManual);}
        if(index < ($scope.fieldsDisplay.length-1)) {myCSV += $scope.csvDivider;}
      });
      myCSV += '\n';
    });
  }

  if($scope.csvType === 'horizontal') {
      //do 
      myCSV += 'id' + $scope.csvDivider;
      _.each(orderedAssets,function(asset, index) {
        myCSV += asset.id;
        if(index < (orderedAssets.length-1)) {myCSV += $scope.csvDivider;}
      });
      myCSV += '\n';

      _.each($scope.fieldsDisplay,function(field) {
        if(field.isMetadata) {
          myCSV += field.meta_id;
        }else{
          myCSV += field.id;
        }
        myCSV += $scope.csvDivider; //field name first
        _.each(orderedAssets,function(asset, index) {
            //apply date filter to values
            if(asset[field.id]) {myCSV += $filter('prettifyDate')(asset[field.id],$scope.prettyDateFormat,$scope.prettyDates,$scope.prettyDatesManual);}
            if(index < (orderedAssets.length-1)) {myCSV += $scope.csvDivider;}
        });
        myCSV += '\n';

      });
  }

  $scope.message('success',"Here's your csv",myCSV);
};

/*****************************************************************/
/*********************  15.3 Error checking  **********************/
/*****************************************************************/

$scope.errorCheckResults = function(results,successCallback,warningCallback,errorCallback) {
  //check for fatal error
  if(!results.length) {
    errorCallback(results);
    return null;
  }

  var successResults = [];
  var errorResults = [];

  //concat all results together
  var allResults = [];
  _.each(results,function(resultsChunk) {
    allResults = allResults.concat(resultsChunk);
  });

  _.each(allResults,function(result,$index) {
    if(result.error) {
      errorResults.push(result);
    }else{
      successResults.push(result);
    }
  });

  var mixedResults = errorResults.concat(successResults);
  if(errorResults.length > 0) {
    warningCallback(mixedResults, errorResults.length, successResults.length);
    return null;
  }

  successCallback(results, results.length);
  return null;
};




/*****************************************************************/
/*****************************************************************/
/*****************************************************************/
/***********************  16. Config Panel  ***********************/
/*****************************************************************/
/*****************************************************************/
/*****************************************************************/

    $scope.createFunctionsReversed = true;

    $scope.chunkType = 'flexible';
    $scope.chunkManualAmount = '10';
    $scope.chunkFlexibleMin = '3';
    $scope.chunkFlexibleMax = '20';
    $scope.chunkFlexibleDivisionAmount = '10';


}); //end ControllerMain
