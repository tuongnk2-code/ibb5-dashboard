// Editorial explanations of the supplied internal scenarios, not current commercial policy.
export const PLAYBOOK_DETAILS = {
 camera:{
  goal:'Giúp khách chọn giải pháp quan sát phù hợp với nhu cầu sử dụng, hiểu rõ thiết bị, lưu trữ, quyền xem và chi phí trước khi quyết định.',
  questions:['Anh/chị muốn quan sát trong nhà, ngoài trời hay khu vực kinh doanh?','Khi có sự việc, anh/chị cần xem trực tiếp hay xem lại? Ai trong gia đình cần được cấp quyền xem?','Anh/chị đang dùng Camera nào và điều gì khiến mình chưa hài lòng?'],
  actions:[
   ['Làm rõ nhu cầu trước khi giới thiệu sản phẩm','Ghi nhận khu vực cần quan sát, thời điểm thường theo dõi và nhu cầu xem lại. Dùng những thông tin này để chọn thiết bị và gói lưu trữ; không giới thiệu hàng loạt tính năng mà khách không cần.'],
   ['Cho khách trải nghiệm đúng tình huống','Demo góc quan sát, chất lượng hình ảnh, thao tác xem trực tiếp và xem lại trên thiết bị đang tư vấn. Những tính năng như cảnh báo hoặc nhận diện phải được kiểm tra trên đúng mẫu Camera và gói dịch vụ.'],
   ['Giải thích lưu trữ và quyền truy cập','Làm rõ dữ liệu được lưu ở đâu, thời gian lưu của gói, cách đăng nhập và cách chia sẻ quyền xem. Khi so sánh lưu trữ trên đám mây với thẻ nhớ hoặc đầu ghi, nêu điều kiện sử dụng và chi phí thay vì khẳng định không có rủi ro.'],
   ['Trình bày đầy đủ chi phí và hỗ trợ','Tách tiền thiết bị, lắp đặt và phí dịch vụ định kỳ. Xác nhận điều kiện bảo hành, bảo trì và kênh tiếp nhận hỗ trợ theo chính sách được phép áp dụng.'],
   ['Xác nhận phương án khách đã hiểu','Nhắc lại vị trí lắp, mẫu thiết bị, gói lưu trữ, người được xem và chi phí. Chỉ chuyển sang đăng ký khi khách đồng ý với phương án cụ thể.']
  ],
  branches:[
   ['Camera ngoài thị trường rẻ hơn thì sao?','Mình nên so sánh cả thiết bị, cách lưu trữ, nhu cầu xem lại và dịch vụ hỗ trợ trong quá trình dùng. Em sẽ tách từng khoản để anh/chị biết phần chênh lệch nằm ở đâu rồi lựa chọn.'],
   ['Có đảm bảo dữ liệu an toàn tuyệt đối không?','Em sẽ giải thích cách bảo vệ tài khoản và phân quyền xem của giải pháp đang tư vấn. Mình vẫn cần quản lý mật khẩu và quyền chia sẻ cẩn thận; em không cam kết rằng mọi hệ thống đều không có rủi ro.'],
   ['Anh/chị chỉ cần xem trực tiếp thôi.','Em sẽ kiểm tra phương án phù hợp với nhu cầu đó và giải thích rõ phần xem lại có hay không trong gói. Mình chọn theo nhu cầu thực tế, không nhất thiết dùng thêm tính năng chưa cần.']
  ],
  completion:['Khách hiểu mẫu Camera và vị trí dự kiến lắp.','Đã xác nhận thời gian lưu, quyền xem và các khoản phí.','Đã làm rõ điều kiện hỗ trợ và bước đăng ký tiếp theo.']
 },
 wifi:{
  goal:'Tìm phương án mạng đáp ứng khu vực khách thường sử dụng và yêu cầu thẩm mỹ; không chốt bằng lời hứa vượt quá kết quả khảo sát.',
  questions:['Nhà mình thường sử dụng mạng ở phòng nào, tầng nào và vào mục đích gì?','Mạng yếu ở mọi vị trí hay chỉ một số nơi? Tình trạng này mới xuất hiện hay đã kéo dài?','Anh/chị ưu tiên giữ nguyên vị trí modem, hạn chế dây nổi hay mức chi phí đầu tư ban đầu?'],
  actions:[
   ['Khảo sát nhu cầu và hiện trạng','Xác định khu vực dùng thường xuyên, số thiết bị và vị trí bộ phát hiện tại. Không tự kết luận modem cũ hỏng chỉ vì gần đây khách cảm thấy mạng yếu.'],
   ['Demo tại các vị trí có ý nghĩa với khách','Thử kết nối ở những phòng và tầng khách thực sự sử dụng. Ghi nhận nơi đạt, nơi chưa đạt; nếu được phép, thử một vị trí đặt bộ phát khác để khách thấy sự khác biệt.'],
   ['Giải thích mối quan hệ giữa vùng phủ và thẩm mỹ','Giải thích dễ hiểu rằng vị trí bộ phát, vật cản và kết cấu nhà ảnh hưởng đến trải nghiệm Wi-Fi. Đưa ra phương án đi dây gọn hoặc dùng nẹp thay vì chỉ yêu cầu khách đổi vị trí.'],
   ['Đưa ra phương án theo khả năng đầu tư','Cùng kỹ thuật cân nhắc đổi vị trí modem, bổ sung điểm phát Wi-Fi hoặc hệ thống Mesh phù hợp. Báo rõ thiết bị, chi phí và phần nhu cầu mỗi phương án có thể đáp ứng sau khảo sát.'],
   ['Thống nhất giới hạn trước khi ký','Nếu khách chưa muốn đầu tư thêm, phải làm rõ khu vực nào chưa đáp ứng và xác nhận phương án khách lựa chọn. Trường hợp chưa có cách đáp ứng nhu cầu, hẹn khảo sát thêm thay vì hứa sẽ tốt toàn bộ ngôi nhà.']
  ],
  branches:[
   ['Trước đây vẫn đặt modem ở đây mà dùng tốt.','Em ghi nhận trải nghiệm trước đây của mình. Em xin kiểm tra lại tại các vị trí anh/chị hay dùng và thử thêm một vị trí đặt thiết bị, rồi mình cùng xem phương án nào đáp ứng tốt hơn hiện tại.'],
   ['Anh/chị không có kinh phí mua thêm bộ phát.','Em sẽ báo rõ phương án đổi vị trí và đi dây gọn trước. Nếu vẫn có khu vực chưa đạt, em sẽ giải thích cụ thể để mình cân nhắc; em không muốn anh/chị đăng ký rồi mới phát sinh điều chưa được tư vấn.'],
   ['Giữ nguyên vị trí này thì có đảm bảo được không?','Theo kết quả thử tại nhà mình, một số vị trí vẫn chưa đáp ứng. Em chưa thể cam kết toàn bộ vùng phủ; em xin nhờ kỹ thuật kiểm tra thêm và thống nhất rõ với anh/chị trước khi triển khai.']
  ],
  completion:['Có kết quả thử ở các khu vực khách thường sử dụng.','Đã thống nhất vị trí thiết bị, đường dây và chi phí bổ sung.','Khách hiểu giới hạn của phương án đã chọn.']
 },
 neighbor:{
  goal:'Xử lý phản ánh bằng thái độ hỗ trợ thực tế, đồng thời giúp khách đang tư vấn có cơ sở đánh giá dịch vụ tại chính nhà mình.',
  questions:['Anh/chị gặp tình trạng yếu ở đâu và thường vào thời điểm nào?','Anh/chị đã liên hệ hỗ trợ chưa và hiện còn vướng mắc nào chưa được giải quyết?','Khách đang tư vấn muốn kiểm tra thêm điều gì sau khi nghe phản ánh này?'],
  actions:[
   ['Lắng nghe và ghi nhận phản ánh','Giữ bình tĩnh, để người phản ánh nói rõ trải nghiệm. Tránh tranh cãi, phủ nhận hoặc đưa kết luận khi chưa biết tình trạng thực tế.'],
   ['Xin phép khách đang được tư vấn','Giải thích rằng mình muốn tiếp nhận vấn đề để hỗ trợ. Nếu có đồng đội, phân công một người hỗ trợ phản ánh và một người tiếp tục trao đổi với khách mới.'],
   ['Xác minh và kết nối hỗ trợ','Xin thông tin phù hợp để kiểm tra dịch vụ, ghi nhận vị trí và thời điểm gặp sự cố. Hướng dẫn kênh hỗ trợ chính thức hoặc tạo yêu cầu theo quy trình; không tự hứa đã khắc phục nếu chưa có kết quả.'],
   ['Quay lại nhu cầu của khách mới','Giải thích rằng mỗi nhà có hiện trạng và nhu cầu khác nhau. Đề nghị khảo sát, demo ở những vị trí khách cần dùng thay vì dùng phản ánh của một nhà để kết luận cho tất cả.'],
   ['Theo dõi đến khi có phản hồi','Lưu thông tin yêu cầu hỗ trợ, người tiếp nhận và thời gian phản hồi đã được xác nhận. Hẹn khách mới bước tiếp theo nếu buổi tư vấn chưa thể hoàn tất.']
  ],
  branches:[
   ['Hàng xóm dùng yếu thì nhà anh/chị cũng sẽ yếu.','Em hiểu vì sao anh/chị lo. Em xin kiểm tra nhu cầu và demo tại nhà mình để đánh giá trực tiếp; đồng thời em sẽ ghi nhận phản ánh của nhà bên để kết nối hỗ trợ.'],
   ['Đã báo nhiều lần rồi mà chưa xong.','Em xin ghi lại thông tin yêu cầu trước đó và tình trạng hiện tại để chuyển đúng bộ phận tiếp tục xử lý. Em sẽ phản hồi theo thông tin xác nhận, không để anh/chị phải kể lại từ đầu nhiều lần.'],
   ['Nhân viên đang đi một mình thì xử lý thế nào?','Em xin phép dành ít phút ghi nhận vấn đề và kết nối hỗ trợ. Nếu cần khảo sát lâu hơn, em sẽ thống nhất lại thời gian với anh/chị để không làm gián đoạn buổi tư vấn mà không có hẹn rõ ràng.']
  ],
  completion:['Phản ánh có thông tin tiếp nhận cụ thể.','Khách mới đã được giải đáp hoặc có lịch tư vấn lại.','Không dùng tranh luận hay lời hứa chưa được xác nhận để chốt khách.']
 },
 competitor:{
  goal:'Giúp khách so sánh các phương án theo nhu cầu và chi phí thực tế, giữ cách tư vấn chuyên nghiệp khi có nhân viên nhà mạng khác.',
  questions:['Điều anh/chị ưu tiên là vùng phủ Wi-Fi, truyền hình, chi phí hay dịch vụ hỗ trợ?','Anh/chị muốn nghe lần lượt từng bên hay nhận thông tin để so sánh sau?','Có điều kiện nào trong các phương án anh/chị chưa rõ?'],
  actions:[
   ['Thống nhất cách trao đổi với khách','Chào hỏi lịch sự, xin phép hoàn tất phần đang trình bày hoặc chờ đến lượt theo mong muốn của khách. Không giành lời hay tạo áp lực phải chọn ngay.'],
   ['Trở về nhu cầu đã xác nhận','Dùng nhu cầu của khách làm tiêu chí: khu vực sử dụng, số thiết bị, nội dung muốn xem và mức chi phí. Không biến cuộc tư vấn thành cuộc tranh luận giữa hai nhân viên.'],
   ['So sánh trên cùng điều kiện','Làm rõ thiết bị, phí ban đầu, phí định kỳ, thời hạn ưu đãi và dịch vụ hỗ trợ. Chỉ nói về chính sách hoặc tính năng có thông tin xác nhận.'],
   ['Đề nghị khách trải nghiệm hoặc xem phương án cụ thể','Nếu được phép, demo giải pháp tại nhà và tóm tắt lợi ích phù hợp. Những điều chưa biết cần kiểm tra lại, không suy đoán để phản bác bên khác.'],
   ['Tôn trọng quyết định và hẹn bước tiếp theo','Nếu khách cần suy nghĩ, xin một lịch liên hệ phù hợp. Nếu khách chọn bên khác, giữ thái độ lịch sự và chỉ lưu thông tin theo sự đồng ý của khách.']
  ],
  branches:[
   ['Bên kia báo giá thấp hơn.','Anh/chị cho em xin phép cùng đối chiếu thiết bị, các khoản phí và thời gian áp dụng để mình so sánh trên cùng điều kiện. Em sẽ nói rõ phương án của FPT phù hợp với nhu cầu nào của nhà mình.'],
   ['Hai bên nói khác nhau thì anh/chị biết tin ai?','Mình có thể kiểm tra lại bằng thông tin chính thức và trải nghiệm demo. Phần nào em chưa xác nhận, em sẽ ghi lại để trả lời rõ thay vì đưa ra kết luận ngay.'],
   ['Anh/chị muốn nghe bên kia trước.','Dạ được ạ. Em xin gửi lại phương án đang tư vấn và hẹn anh/chị thời gian phù hợp để giải đáp những điểm còn cần so sánh.']
  ],
  completion:['Khách có thông tin đủ để so sánh trên cùng điều kiện.','Đã giải thích các điểm khác biệt liên quan đến nhu cầu.','Có quyết định hoặc lịch liên hệ tiếp theo rõ ràng.']
 },
 decision:{
  goal:'Có sự đồng thuận của người quyết định và người sử dụng, hạn chế việc đăng ký xong rồi phát sinh phản đối trong gia đình.',
  questions:['Trong gia đình mình, ai sẽ cùng quyết định gói dịch vụ và chi phí?','Người đó quan tâm nhất đến điều gì khi chọn mạng?','Mình có thể cùng trao đổi qua điện thoại hay nên hẹn lúc có mặt đầy đủ?'],
  actions:[
   ['Làm rõ vai trò của người đang trao đổi','Ghi nhận nhu cầu và sự đồng ý hiện tại, đồng thời hỏi ai cùng sử dụng và quyết định. Không xem việc một người thích phương án là sự đồng ý thay cho tất cả.'],
   ['Tóm tắt phương án để thông tin không bị lệch','Gửi lại gói dịch vụ, thiết bị, vị trí lắp và chi phí. Giúp người ở nhà có thông tin rõ để trao đổi với gia đình, thay vì nhờ họ truyền đạt những lời hứa chung chung.'],
   ['Xin phép kết nối người quyết định','Nếu thuận tiện và có sự đồng ý, gọi điện hoặc trao đổi trực tuyến cùng người quyết định. Giải thích lại nhu cầu đã ghi nhận và hỏi thêm băn khoăn của họ.'],
   ['Hẹn cụ thể khi chưa thể trao đổi','Nếu người quyết định đang bận, thống nhất giờ gọi lại hoặc thời gian quay lại nhà. Tránh gọi liên tục hoặc tự đến nơi làm việc khi chưa được đồng ý.'],
   ['Chỉ hoàn tất khi đã xác nhận đồng thuận','Nhắc lại phương án và bước đăng ký. Việc lấy giấy tờ, nhận tiền và tạo hợp đồng phải đúng sự đồng ý của khách và quy trình được áp dụng.']
  ],
  branches:[
   ['Cứ đăng ký đi, khi về anh/chị sẽ nói lại.','Em cảm ơn anh/chị. Để tránh gia đình còn điều chưa rõ, em xin gửi lại phương án và xác nhận thêm với người cùng quyết định trước khi hoàn tất hồ sơ nhé.'],
   ['Người quyết định đang bận, không nghe máy.','Mình cho em xin khung giờ thuận tiện để gọi lại hoặc qua tư vấn có đủ người nhé. Em sẽ gửi trước các thông tin chính để buổi sau mình trao đổi nhanh hơn.'],
   ['Người nhà chưa đồng ý về chi phí.','Em xin nghe rõ mức chi phí và nhu cầu gia đình muốn cân đối. Em sẽ kiểm tra phương án phù hợp hơn, rồi giải thích đầy đủ điều kiện để cả nhà cùng quyết định.']
  ],
  completion:['Xác định được người cùng quyết định.','Phương án và chi phí đã được truyền đạt đầy đủ.','Có sự đồng thuận hoặc lịch hẹn trao đổi lại cụ thể.']
 },
 cabling:{
  goal:'Giải quyết đồng thời yêu cầu kỹ thuật và thẩm mỹ bằng phương án đã khảo sát, tránh phát sinh tranh cãi khi đến lắp đặt.',
  questions:['Đường ống âm tường hiện có đi đến những vị trí nào và từng được kiểm tra chưa?','Anh/chị muốn giữ nguyên những khu vực nào, có chấp nhận nẹp dây hoặc đổi vị trí thiết bị không?','Những phòng nào cần kết nối ổn định và thiết bị nào cần dùng dây?'],
  actions:[
   ['Khảo sát cùng kỹ thuật','Xác định tuyến dây, vị trí thiết bị và khả năng sử dụng đường ống sẵn có. Trường hợp cần người có chuyên môn về điện hoặc xây dựng hỗ trợ, phải trao đổi trước với chủ nhà.'],
   ['Giải thích vì sao cần thay đổi phương án','Dùng sơ đồ hoặc chỉ trực tiếp tuyến dây để khách hiểu vấn đề. Không chỉ nói rằng dây cũ không dùng được mà chưa giải thích cho khách biết cần thay phần nào.'],
   ['Trình bày các cách xử lý có thể thực hiện','Cân nhắc tận dụng đường ống sau kiểm tra, đi dây gọn sát góc tường bằng nẹp, hoặc điều chỉnh vị trí thiết bị. Mỗi cách cần nêu phạm vi thực hiện và ảnh hưởng đến nhà.'],
   ['Đánh giá thiết bị bổ sung theo nhu cầu','Bộ phát Wi-Fi dạng Mesh hoặc thiết bị truyền hình dùng kết nối không dây chỉ được đề xuất khi tương thích và đáp ứng khảo sát. Giải thích phần nào vẫn cần nguồn điện hoặc đường dây.'],
   ['Chốt phương án trước khi triển khai','Ghi nhận tuyến dây, vị trí, chi phí phát sinh và sự đồng ý của khách. Nếu chưa thống nhất, hẹn khảo sát bổ sung thay vì để kỹ thuật đến rồi mới thương lượng.']
  ],
  branches:[
   ['Anh/chị nhất quyết không cho đi dây nổi.','Em ghi nhận yêu cầu đó. Em xin nhờ kỹ thuật kiểm tra đường ống và các phương án khác trước; nếu chưa có cách đáp ứng, em sẽ báo rõ để mình quyết định, không tự ý thi công.'],
   ['Có thể dùng toàn bộ không dây không?','Em sẽ kiểm tra từng thiết bị và nhu cầu sử dụng. Một số kết nối có thể dùng không dây nhưng vẫn có điều kiện về vị trí, nguồn điện và tín hiệu; em sẽ báo phương án sau khảo sát.'],
   ['Có phát sinh thêm tiền không?','Em sẽ tách rõ phần thiết bị, vật tư hoặc công việc bổ sung nếu có và xác nhận trước với anh/chị. Khi chưa được đồng ý, mình chưa triển khai phần phát sinh.']
  ],
  completion:['Có phương án kỹ thuật và tuyến dây đã khảo sát.','Khách đồng ý vị trí, thẩm mỹ và chi phí phát sinh.','Kỹ thuật nhận được đầy đủ nội dung đã thống nhất.']
 },
 experience:{
  goal:'Chuyển trải nghiệm cá nhân thành bài học có thể áp dụng, theo dõi và chia sẻ trong phòng.',
  questions:['Tình huống cụ thể nào trong tháng khiến mình thay đổi cách làm?','Mình đã làm gì khác và kết quả quan sát được là gì?','Điều gì có thể lặp lại, điều gì cần điều chỉnh khi áp dụng cho khách khác?'],
  actions:[
   ['Chọn một việc thực tế','Có thể là chăm sóc khách cũ, xử lý một ca khó, sắp xếp thời gian hoặc phối hợp đồng đội. Trình bày bối cảnh đủ rõ để người khác hiểu vấn đề ban đầu.'],
   ['Mô tả hành động thay vì nhận xét chung','Nêu mình đã hỏi gì, phối hợp với ai, liên hệ lại khi nào và thay đổi cách tư vấn ra sao. Tránh chỉ kết luận rằng mình nhiệt tình hoặc đã cố gắng.'],
   ['Ghi nhận kết quả có căn cứ','Nêu phản hồi hoặc kết quả thật đã ghi nhận. Không suy rộng một trải nghiệm cá nhân thành cam kết về tỷ lệ chốt hay thành tích chung của cả phòng.'],
   ['Rút ra bài học và điều kiện áp dụng','Giải thích điều gì có ích, điều gì chưa tốt và tình huống nào có thể áp dụng tương tự. Những ưu đãi trong câu chuyện cần được xem là thông tin tại thời điểm đó.'],
   ['Chọn một việc làm tiếp trong tuần','Thống nhất với quản lý một việc cụ thể để thử lại, thời điểm xem kết quả và cách ghi nhận. Có thể dùng cho trao đổi đầu tuần hoặc chia sẻ cuối tuần.']
  ],
  branches:[
   ['Chưa có hợp đồng nổi bật thì có gì để chia sẻ?','Mình có thể chia sẻ một việc đã cải thiện như hẹn khách rõ hơn, theo dõi hỗ trợ đến cùng hoặc sắp xếp lại lịch làm việc. Điều cần rõ là hành động và bài học thực tế.'],
   ['Thử cách mới nhưng chưa thành công thì sao?','Hãy ghi lại bối cảnh, điều đã thử và điểm khiến cách đó chưa phù hợp. Một kinh nghiệm chưa thành công vẫn hữu ích nếu giúp đồng đội tránh lặp lại sai sót.'],
   ['Làm sao để áp dụng kinh nghiệm của đồng nghiệp?','Hỏi thêm điều kiện của tình huống gốc, rồi chọn một phần phù hợp để thử. Không áp dụng nguyên lời thoại hay ưu đãi nếu khách hàng và chính sách đã khác.']
  ],
  completion:['Bài chia sẻ có bối cảnh, hành động và kết quả thực tế.','Phân biệt rõ kinh nghiệm cá nhân với chính sách chung.','Có một hành động cụ thể để áp dụng tiếp.']
 },
 hesitation:{
  goal:'Làm rõ lý do khách chưa quyết định, xử lý phần có thể giải đáp và thống nhất một bước tiếp theo có thời gian cụ thể.',
  questions:['Sau khi trải nghiệm, điều nào anh/chị thấy phù hợp và điều nào còn băn khoăn?','Anh/chị cần cân nhắc thêm chi phí, chất lượng, phương án lắp đặt hay trao đổi với gia đình?','Nếu chưa quyết định hôm nay, mình thuận tiện trao đổi lại vào thời gian nào?'],
  actions:[
   ['Xác nhận trải nghiệm sau demo','Hỏi khách về phần họ đã thích và điểm chưa đáp ứng. Không tự hiểu câu “để mai” là từ chối hoặc đồng ý đăng ký.'],
   ['Tìm đúng nguyên nhân lưỡng lự','Đặt câu hỏi mở và lắng nghe. Nếu khách cần người nhà cùng quyết định, chuyển sang cách xử lý của tình huống người quyết định chưa có mặt.'],
   ['Giải đáp bằng thông tin cụ thể','Nếu vướng kỹ thuật, kiểm tra lại phương án; nếu vướng chi phí, trình bày đầy đủ các khoản tiền và lựa chọn phù hợp. Chỉ dùng ưu đãi khi có điều kiện áp dụng và được xác nhận.'],
   ['Đưa ra bước tiếp theo phù hợp mức sẵn sàng','Khách đã hiểu và đồng thuận thì tiến hành đúng quy trình đăng ký. Nếu khách cần thêm thời gian, gửi tóm tắt phương án để họ xem lại, không tự tạo hợp đồng thay cho sự đồng ý.'],
   ['Hẹn chăm sóc lại rõ ngày và giờ','Thống nhất nội dung sẽ trao đổi trong lần sau, ai cùng tham gia và kênh liên hệ. Ghi lại băn khoăn chưa giải quyết để lần sau không phải bắt đầu lại từ đầu.']
  ],
  branches:[
   ['Cứ để mai anh/chị tính.','Dạ được ạ. Trước khi về, em xin hỏi mình đang cần cân nhắc thêm điểm nào để em gửi đúng thông tin. Ngày mai em liên hệ vào … giờ có thuận tiện cho anh/chị không?'],
   ['Giá còn cao so với dự tính.','Em xin cùng anh/chị xem lại nhu cầu và từng khoản chi phí. Nếu có phương án hoặc ưu đãi phù hợp, em sẽ kiểm tra điều kiện và báo rõ, không chỉ giảm giá mà bỏ qua nhu cầu sử dụng.'],
   ['Anh/chị cần hỏi thêm người nhà.','Em sẽ gửi lại nội dung gói, thiết bị và chi phí. Mình có thể hẹn một buổi có người nhà cùng trao đổi để em giải đáp đầy đủ hơn không ạ?']
  ],
  completion:['Biết được lý do khách chưa quyết định.','Đã giải đáp hoặc ghi rõ thông tin còn cần xác nhận.','Có lịch hẹn lại và sự đồng ý liên hệ của khách.']
 },
 payment:{
  goal:'Giải quyết lo ngại về thanh toán bằng quy trình và thông tin xác thực, không để nhân viên tự đưa ra ngoại lệ chưa được duyệt.',
  questions:['Anh/chị muốn thanh toán sau vì lo ngại thông tin nhân viên, kết quả lắp đặt hay lý do khác?','Anh/chị đã nắm các khoản phải thanh toán và chứng từ nhận được chưa?','Anh/chị muốn xác minh thông tin qua kênh chính thức nào để yên tâm hơn?'],
  actions:[
   ['Lắng nghe lý do khách chưa muốn thanh toán','Thừa nhận mối lo trước khi giải thích quy trình. Phân biệt lo bị lừa, chưa hiểu khoản thu và muốn kiểm tra kết quả lắp đặt vì mỗi trường hợp cần cách giải đáp khác nhau.'],
   ['Giải thích trình tự đang được áp dụng','Trình bày rõ bước đăng ký, yêu cầu thanh toán, xác nhận và triển khai theo quy trình đã được kiểm tra. Không lấy một lời kể trong tài liệu cũ làm điều kiện bắt buộc cho mọi hồ sơ hiện tại.'],
   ['Hướng dẫn xác minh qua kênh chính thức','Cho khách kiểm tra thông tin hợp đồng, thông báo thanh toán và chứng từ qua kênh công ty cho phép. Làm rõ số tiền, nội dung thanh toán và người hoặc tài khoản được phép nhận.'],
   ['Xin ý kiến khi khách cần ngoại lệ','Nếu khách vẫn muốn lắp xong mới trả, trao đổi quản lý về phương án được phép áp dụng. Chỉ báo lại khi đã được xác nhận; không tự thu cọc, tự ứng tiền hoặc hứa thay quy trình.'],
   ['Ghi nhận kết quả và hẹn phản hồi','Nếu thống nhất được, nhắc lại bước tiếp theo. Nếu đang chờ quản lý, báo rõ nội dung cần xác nhận và thời điểm phản hồi để khách không phải chờ không biết lý do.']
  ],
  branches:[
   ['Anh/chị sợ chuyển tiền cho nhầm người.','Em hiểu ạ. Mình sẽ kiểm tra thông tin hợp đồng và hướng dẫn thanh toán qua kênh chính thức trước. Em sẽ giải thích rõ chứng từ anh/chị nhận được để mình xác minh rồi mới thực hiện.'],
   ['Lắp xong dùng tốt rồi anh/chị mới trả.','Em ghi nhận mong muốn kiểm tra dịch vụ trước. Em xin xác nhận với quản lý phương án được phép cho hồ sơ của mình rồi báo lại rõ, thay vì hứa một cách chưa được duyệt.'],
   ['Em cứ nộp hộ trước đi.','Em sẽ thực hiện đúng quy trình thanh toán của công ty. Nếu anh/chị chưa thể thanh toán theo phương án hiện tại, em xin trao đổi quản lý để có hướng xử lý được xác nhận.']
  ],
  completion:['Khách hiểu khoản thu và cách xác minh.','Phương thức nhận tiền và chứng từ đã được làm rõ.','Mọi ngoại lệ đều có xác nhận trước khi cam kết với khách.']
 },
 voucher:{
  goal:'Dùng ưu đãi có kiểm soát để giải quyết trở ngại thực tế, tránh lệ thuộc voucher hoặc tư vấn khác chính sách.',
  questions:['Khách đang vướng chi phí ban đầu, cước định kỳ hay còn chưa thấy giá trị dịch vụ?','Hồ sơ này có đáp ứng điều kiện ưu đãi và cần ai phê duyệt?','Sau khi ưu đãi kết thúc, khách sẽ thanh toán thế nào và đã hiểu rõ chưa?'],
  actions:[
   ['Tư vấn phương án và giá trị dịch vụ trước','Xác định nhu cầu, thiết bị và chất lượng hỗ trợ khách cần. Trình bày giá áp dụng rồi mới đánh giá ưu đãi có thực sự giải quyết được trở ngại hay không.'],
   ['Cân nhắc lợi ích và tác động của voucher','Ưu đãi có thể hỗ trợ khách còn vướng chi phí, nhưng lạm dụng dễ làm nhân viên phụ thuộc giảm giá và gây thắc mắc khi khách so sánh. Không dùng voucher như lời mở đầu cho mọi cuộc tư vấn.'],
   ['Kiểm tra điều kiện và thẩm quyền duyệt','Xác nhận loại voucher, đối tượng, thời hạn, số lượng và người có quyền phê duyệt theo chính sách hiện tại. Các tỷ lệ hoặc chương trình trong tài liệu là ý kiến lịch sử, không tự động áp dụng.'],
   ['Thông báo đầy đủ trước khi khách đăng ký','Giải thích khoản được giảm hoặc được tặng, thời gian áp dụng, giá sau ưu đãi và điều kiện liên quan. Không tự gọi ưu đãi là duy nhất hoặc chỉ còn hôm nay nếu không có căn cứ.'],
   ['Ghi nhận và chăm sóc sau đăng ký','Lưu nội dung ưu đãi đã xác nhận để việc nhập hồ sơ và giải đáp sau này nhất quán. Khi khách giới thiệu người quen, kiểm tra lại điều kiện của hồ sơ mới thay vì hứa được hưởng giống nhau.']
  ],
  branches:[
   ['Khách khác được giảm, sao anh/chị không có?','Em sẽ kiểm tra điều kiện từng chương trình và hồ sơ để giải thích rõ. Nếu anh/chị đủ điều kiện, em sẽ xác nhận ưu đãi được áp dụng; nếu khác điều kiện, em sẽ nói rõ phần khác nhau.'],
   ['Không có voucher thì anh/chị không đăng ký.','Em đã ghi nhận phần chi phí mình đang cân nhắc. Em xin kiểm tra ưu đãi hợp lệ và phương án dịch vụ phù hợp, rồi báo lại mức phí cùng điều kiện đầy đủ để anh/chị lựa chọn.'],
   ['Nhân viên có thể tự hứa giảm thêm không?','Mức ưu đãi cần đúng chính sách và thẩm quyền phê duyệt. Em chỉ xác nhận với anh/chị sau khi kiểm tra được điều kiện áp dụng cho hồ sơ này.']
  ],
  completion:['Ưu đãi giải quyết đúng trở ngại của khách.','Đã xác nhận điều kiện và quyền phê duyệt.','Khách hiểu giá, thời hạn và các điều kiện sau ưu đãi.']
 }
};

const abbreviations = new Map([
 ['NVKD','nhân viên kinh doanh'],['KH','khách hàng'],['K/H','khách hàng'],['KHTN','khách hàng tiềm năng'],['HĐ','hợp đồng'],['PHM','phí hòa mạng'],['PTTB','phát triển thuê bao'],['VC','voucher (phiếu ưu đãi)'],['CTKM','chương trình khuyến mãi'],['CTY','công ty'],['CN','chi nhánh'],['KT','kỹ thuật'],['CSKH','chăm sóc khách hàng'],['SĐT','số điện thoại'],['SDT','số điện thoại'],['ĐT','điện thoại'],['TLS','tư vấn qua điện thoại'],['AP','bộ phát Wi-Fi bổ sung'],['TT','thị trường']
]);
export function readableSourceText(text, chapterId) {
 let value=String(text);
 for(const [short,full] of abbreviations){const pattern=short.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');value=value.replace(new RegExp('(?<![\\p{L}\\p{N}])'+pattern+'(?![\\p{L}\\p{N}])','giu'),full);}
 if(chapterId!=='camera')value=value.replace(/(?<![\p{L}\p{N}])HD(?![\p{L}\p{N}])/gu,'hợp đồng');
 return value;
}
